import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modalize } from 'react-native-modalize';
import axios from 'axios';

const Withdraw = () => {
  const navigation = useNavigation();
  const switchAccountModalRef = useRef(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [walletDetails, setWalletDetails] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('naira');
  const [userToken, setUserToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [transactionPin, setTransactionPin] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    fetchWalletDetails(selectedAccount);
  }, [selectedAccount]);


  const fetchWalletDetails = async () => {
    try {
      setIsLoading(true); 

      const userToken = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        'https://api-staging.ramufinance.com/api/v1/get-wallet-details',
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      // Assuming NGN is for Naira and USD is for Dollar
      const nairaDetails = response.data.data.find((wallet) => wallet.currency_code === 'NGN');
      const dollarDetails = response.data.data.find((wallet) => wallet.currency_code === 'USD');

      setWalletDetails({
        naira: nairaDetails,
        dollar: dollarDetails,
      });

      setIsLoading(false); 
    } catch (error) {
      setIsLoading(false); 
      console.error('Error fetching wallet details:', error);
      Alert.alert('Error', 'Failed to fetch wallet details.');
    }
  };

  const toggleBalanceVisibility = () => {
    setBalanceVisible((prevVisible) => !prevVisible);
  };

  const renderSwitchAccountButton = () => (
    <TouchableOpacity onPress={handleSwitchAccount}>
      <View style={styles.switchAccountContainer}>
        {selectedAccount === 'naira' ? (
          <Image source={require('../Assests/nigeria.png')} style={styles.countryLogo} />
        ) : (
          <Image source={require('../Assests/usa.png')} style={styles.countryLogo} />
        )}
        <Feather name="chevron-down" size={24} color="white" />
      </View>
    </TouchableOpacity>
  );

  const handleSwitchAccount = () => {
    switchAccountModalRef.current?.open();
  };

  const handleAccountSelection = (accountType) => {
    if (accountType === selectedAccount) {
      switchAccountModalRef.current?.close();
    } else {
      setSelectedAccount(accountType);
    }
  };


  const handleWithdraw = async () => {
    if (!withdrawAmount || !transactionPin || !narration) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
  
    try {
      setIsLoading(true);
  
      const userToken = await AsyncStorage.getItem('userToken');
  
      const withdrawData = {
        amount: parseFloat(withdrawAmount),
        wallet_address: walletDetails?.naira?.wallet_address,
        transaction_pin: parseInt(transactionPin),
        narration,
      };
  
      const response = await axios.post(
        'https://api-staging.ramufinance.com/api/v1/withdraw-to-bank',
        withdrawData,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
  
      if (response.status === 200 && response.data.status) {
        navigation.navigate('PaymentConfirm');
      } else {
        console.error('Withdrawal failed - Response:', response);
        if (response.data && response.data.message) {
          Alert.alert('Error', `Failed to withdraw. Reason: ${response.data.message}`);
        } else {
          Alert.alert('Error', 'Failed to withdraw. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
    
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
    
        if (error.response.data && error.response.data.message) {
          Alert.alert('Error', `Failed to withdraw. Reason: ${error.response.data.message}`);
        } else {
          Alert.alert('Error', `Failed to withdraw. Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        Alert.alert('Error', 'Failed to withdraw. No response received from the server.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        Alert.alert('Error', 'Failed to withdraw. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }    
  };
  
  
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.Title}>Withdraw</Text>
        <View style={styles.topBar}>
          <Text style={styles.accountBalance}>Account Balance</Text>
          <View style={styles.balanceContainer}>
            {renderSwitchAccountButton()}
            <TouchableOpacity onPress={toggleBalanceVisibility}>
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.balanceText}>
                  {balanceVisible ? (
                    selectedAccount === 'naira' ? (
                      `₦${walletDetails?.naira?.balance}`
                    ) : (
                      `$${walletDetails?.dollar?.balance}`
                    )
                  ) : (
                    '*******'
                  )}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleBalanceVisibility} style={styles.eyeIconContainer}>
              {balanceVisible ? (
                <Feather name="eye-off" size={24} color="white" />
              ) : (
                <Feather name="eye" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Enter amount to withdraw"
          keyboardType="numeric"
          value={withdrawAmount}
          onChangeText={(text) => setWithdrawAmount(text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Enter 4-digit transaction PIN"
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
          value={transactionPin}
          onChangeText={(text) => setTransactionPin(text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Enter narration"
          value={narration}
          onChangeText={(text) => setNarration(text)}
        />

        <Text style={styles.transactionLimits}>
          1. Minimum per transaction: N1000.00{'\n'}
          2. Maximum per transaction: N1000000.00
        </Text>

        <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
          <Text style={styles.buttonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      <Modalize ref={switchAccountModalRef} adjustToContentHeight>
        <View style={styles.modalContainer}>
          <TouchableOpacity onPress={() => handleAccountSelection('naira')} style={styles.modalOptionContainer}>
            <Image source={require('../Assests/nigeria.png')} style={styles.countryLogo} />
            <Text style={styles.modalOption}>Switch to Naira Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleAccountSelection('dollar')} style={styles.modalOptionContainer}>
            <Image source={require('../Assests/usa.png')} style={styles.countryLogo} />
            <Text style={styles.modalOption}>Switch to Dollar Account</Text>
          </TouchableOpacity>
        </View>
      </Modalize>
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  Title: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#51CC62',
    marginTop: 30,
  },
  topBar: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    height: 170,
    backgroundColor: '#147603',
    borderRadius: 30,
    marginTop: 30,
    width: '100%',
    marginLeft: 10,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 10,
    marginBottom: 40,
  },
  countryLogo: {
    width: 30,
    height: 20,
    marginRight: 5,
    marginTop: 10,
  },
  modalContainer: {
    padding: 20,
  },
  modalOption: {
    fontSize: 18,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  modalOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  eyeIconContainer: {
    marginLeft: 50,
  },
  accountBalance: {
    fontSize: 17,
    fontWeight: 'normal',
    color: 'white',
    marginTop: 30,
    marginLeft: 20,
  },
  balanceText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  switchAccountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  input: {
    height: 60,
    borderColor: '#51CC62',
    borderWidth: 1.5,
    marginBottom: 30,
    paddingLeft: 10,
    width: '100%',
    borderRadius: 15,
  },
  transactionLimits: {
    fontSize: 17,
    marginBottom: 40,
    textAlign: 'left',
  },
  withdrawButton: {
    backgroundColor: '#51CC62',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    height: 52,
    width: '100%',
    marginTop: 40,
  },
  buttonText: {
    color: 'white',
    fontSize: 22,
  },
});

export default Withdraw;
