/**
 * EasyPOS - Mobile Point of Sales System
 * A simple app that allows merchants to accept payments on their smartphones
 * 
 * Features implemented:
 * - User authentication (login/registration) with local storage
 * - Payment processing with amount entry
 * - Payment confirmation
 * - Responsive UI with minimalist design
 * 
 * How to test:
 * 1. Register a new account or use the demo account (username: demo, password: password)
 * 2. Enter a payment amount
 * 3. Process the payment
 * 4. View the payment confirmation
 * 5. Try logging out and logging back in to test persistence
 * 
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  useColorScheme,
  Switch,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

// Storage utility functions with error handling
const storage = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key} from storage:`, error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting item ${key} in storage:`, error);
      return false;
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key} from storage:`, error);
      return false;
    }
  }
};

// Mock user data for demonstration
const mockUsers = [
  {
    username: 'demo',
    password: 'password',
    merchantName: 'Demo Store',
  },
];

// Main App component
function App() {
  const isDarkMode = useColorScheme() === 'dark';
  // Safely access the Stripe SDK
  const stripe = useStripe();
  const initPaymentSheet = stripe?.initPaymentSheet;
  const presentPaymentSheet = stripe?.presentPaymentSheet;
  const createToken = stripe?.createToken;

  // Check if Stripe SDK is available
  useEffect(() => {
    if (!stripe) {
      console.error('Stripe SDK could not be found. Make sure @stripe/stripe-react-native is installed correctly.');
    }
  }, [stripe]);

  // State variables
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);

  // Dashboard and navigation state
  const [showDashboard, setShowDashboard] = useState(true);
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [showBankAccountSetup, setShowBankAccountSetup] = useState(false);

  // Bank account state
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankRoutingNumber, setBankRoutingNumber] = useState('');
  const [enableAutoTransfer, setEnableAutoTransfer] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);

  // Check if user is already logged in using AsyncStorage
  useEffect(() => {
    const checkLoggedInUser = async () => {
      const savedUser = await storage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
          setIsLoggedIn(true);

          // Load bank account information if it exists
          if (parsedUser.bankAccount) {
            setBankAccountName(parsedUser.bankAccount.accountName || '');
            setBankAccountNumber(parsedUser.bankAccount.accountNumber || '');
            setBankRoutingNumber(parsedUser.bankAccount.routingNumber || '');
            setEnableAutoTransfer(parsedUser.bankAccount.autoTransfer || false);
            setHasBankAccount(
              !!(parsedUser.bankAccount.accountName && 
                 parsedUser.bankAccount.accountNumber && 
                 parsedUser.bankAccount.routingNumber)
            );
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    checkLoggedInUser();
  }, []);

  // Handle login
  const handleLogin = async () => {
    try {
      // First check if the user exists in our mock data
      const user = mockUsers.find(
        (user) => user.username === username && user.password === password
      );

      if (user) {
        // Store user data in storage
        const success = await storage.setItem('user', JSON.stringify(user));
        if (!success) {
          Alert.alert('Login Warning', 'Logged in successfully, but could not save session data.');
        }

        setCurrentUser(user);
        setIsLoggedIn(true);
      } else {
        // Try to get users from storage to check if the user exists there
        const storedUsersJson = await storage.getItem('users');
        if (storedUsersJson) {
          try {
            const storedUsers = JSON.parse(storedUsersJson);
            const storedUser = storedUsers.find(
              (u) => u.username === username && u.password === password
            );

            if (storedUser) {
              // Store current user in storage
              const success = await storage.setItem('user', JSON.stringify(storedUser));
              if (!success) {
                Alert.alert('Login Warning', 'Logged in successfully, but could not save session data.');
              }

              setCurrentUser(storedUser);
              setIsLoggedIn(true);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing stored users:', parseError);
          }
        }

        Alert.alert('Login Failed', 'Invalid username or password');
      }
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Login Error', 'An error occurred during login. Please try again.');
    }
  };

  // Handle registration
  const handleRegister = async () => {
    try {
      if (password !== confirmPassword) {
        Alert.alert('Registration Failed', 'Passwords do not match');
        return;
      }

      if (!username || !password || !merchantName) {
        Alert.alert('Registration Failed', 'All fields are required');
        return;
      }

      // Create new user object
      const newUser = {
        username,
        password,
        merchantName,
        bankAccount: {
          accountName: '',
          accountNumber: '',
          routingNumber: '',
          connected: false,
          autoTransfer: false,
        },
      };

      // Get existing users from storage or create empty array
      const storedUsersJson = await storage.getItem('users');
      let users = [];

      if (storedUsersJson) {
        try {
          users = JSON.parse(storedUsersJson);

          // Check if username already exists
          const userExists = users.some(user => user.username === username);
          if (userExists) {
            Alert.alert('Registration Failed', 'Username already exists');
            return;
          }
        } catch (parseError) {
          console.error('Error parsing stored users:', parseError);
          // Continue with empty users array
        }
      }

      // Add new user to users array
      users.push(newUser);

      // Save updated users array to storage
      const usersSuccess = await storage.setItem('users', JSON.stringify(users));

      // Save current user to storage
      const userSuccess = await storage.setItem('user', JSON.stringify(newUser));

      if (!usersSuccess || !userSuccess) {
        Alert.alert('Registration Warning', 'Account created, but there was an issue saving your data. Some features may not work properly.');
      }

      // Update state
      setCurrentUser(newUser);
      setIsLoggedIn(true);
      setIsRegistering(false);

      // Also add to mock users for this session
      mockUsers.push(newUser);
    } catch (error) {
      console.error('Error during registration:', error);
      Alert.alert('Registration Error', 'An error occurred during registration. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    // Clear user from storage
    const success = await storage.removeItem('user');

    if (!success) {
      Alert.alert('Logout Warning', 'There was an issue clearing your session data. You may still be logged in next time you open the app.');
    }

    // Update state regardless of storage success
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setMerchantName('');
  };

  // Handle saving bank account
  const handleSaveBankAccount = async () => {
    try {
      if (!bankAccountName || !bankAccountNumber || !bankRoutingNumber) {
        Alert.alert('Invalid Input', 'All fields are required');
        return;
      }

      // Check if Stripe SDK is available
      if (!createToken) {
        Alert.alert('Error', 'Stripe SDK could not be found. Make sure @stripe/stripe-react-native is installed correctly.');
        return;
      }

      // Create a token with Stripe
      const { token, error } = await createToken({
        type: 'BankAccount',
        name: bankAccountName,
        accountNumber: bankAccountNumber,
        routingNumber: bankRoutingNumber,
        country: 'US',
        currency: 'usd',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Update user with bank account info
      const updatedUser = {
        ...currentUser,
        bankAccount: {
          accountName: bankAccountName,
          accountNumber: bankAccountNumber,
          routingNumber: bankRoutingNumber,
          connected: true,
          autoTransfer: enableAutoTransfer,
          stripeToken: token.id,
        },
      };

      // Save updated user to storage
      const success = await storage.setItem('user', JSON.stringify(updatedUser));

      if (!success) {
        Alert.alert('Warning', 'Could not save bank account information.');
        return;
      }

      // Update stored users array
      const storedUsersJson = await storage.getItem('users');
      if (storedUsersJson) {
        try {
          const storedUsers = JSON.parse(storedUsersJson);
          const updatedUsers = storedUsers.map(user => 
            user.username === updatedUser.username ? updatedUser : user
          );

          await storage.setItem('users', JSON.stringify(updatedUsers));
        } catch (error) {
          console.error('Error updating users array:', error);
        }
      }

      // Update state
      setCurrentUser(updatedUser);
      setHasBankAccount(true);
      setShowBankAccountSetup(false);
      setShowDashboard(true);

      Alert.alert('Success', 'Bank account information saved successfully.');
    } catch (error) {
      console.error('Error saving bank account:', error);
      Alert.alert('Error', 'An error occurred while saving bank account information.');
    }
  };

  // Handle payment processing
  const handleProcessPayment = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      // Check if Stripe SDK is available
      if (!initPaymentSheet || !presentPaymentSheet) {
        Alert.alert('Error', 'Stripe SDK could not be found. Make sure @stripe/stripe-react-native is installed correctly.');
        return;
      }

      // Convert amount to cents for Stripe
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Initialize the payment sheet in test mode
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: currentUser?.merchantName || 'EasyPOS',
        // In test mode, we can use the setupIntentClientSecret option instead of paymentIntentClientSecret
        setupIntentClientSecret: 'seti_1234567890',
        // Remove customerEphemeralKeySecret as it's not needed in this test configuration
        customerId: currentUser?.username, // In a real app, you would use a real customer ID
        testEnv: true, // Use test environment
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      // Present the payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // User canceled the payment
          return;
        }
        Alert.alert('Error', presentError.message);
        return;
      }

      // Payment successful
      setShowPaymentScreen(false);
      setShowPaymentConfirmation(true);

      // If auto-transfer is enabled and bank account is connected, transfer the funds
      if (currentUser?.bankAccount?.autoTransfer && currentUser?.bankAccount?.connected) {
        Alert.alert(
          'Auto-Transfer Enabled',
          `$${parseFloat(amount).toFixed(2)} will be automatically transferred to your bank account.`
        );
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'An error occurred while processing the payment.');
    }
  };

  // Reset payment
  const handleNewPayment = () => {
    setAmount('');
    setShowPaymentConfirmation(false);
    setShowPaymentScreen(true);
  };

  // Render login screen
  const renderLoginScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>EasyPOS</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(true)}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );

  // Render registration screen
  const renderRegistrationScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>EasyPOS</Text>
      <Text style={styles.subtitle}>Create a new account</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Merchant Name"
        value={merchantName}
        onChangeText={setMerchantName}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(false)}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );

  // Render dashboard screen
  const renderDashboardScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>EasyPOS Dashboard</Text>
      <Text style={styles.subtitle}>
        Welcome, {currentUser?.merchantName || 'Merchant'}
      </Text>

      <TouchableOpacity 
        style={styles.dashboardButton} 
        onPress={() => {
          setShowDashboard(false);
          setShowBankAccountSetup(true);
          setShowPaymentScreen(false);
        }}
      >
        <Text style={styles.buttonText}>Enter Bank Details</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.dashboardButton} 
        onPress={() => {
          setShowDashboard(false);
          setShowBankAccountSetup(false);
          setShowPaymentScreen(true);
        }}
      >
        <Text style={styles.buttonText}>Take Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  // Render payment screen
  const renderPaymentScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Take Payment</Text>
      <Text style={styles.subtitle}>Enter amount to charge</Text>

      <TextInput
        style={styles.amountInput}
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TouchableOpacity style={styles.button} onPress={handleProcessPayment}>
        <Text style={styles.buttonText}>Process Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => {
          setShowDashboard(true);
          setShowPaymentScreen(false);
        }}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  // Render bank account setup screen
  const renderBankAccountSetup = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.title}>Bank Account Setup</Text>
      <Text style={styles.subtitle}>
        Enter your bank details to enable automatic transfers
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Account Holder Name"
        value={bankAccountName}
        onChangeText={setBankAccountName}
      />

      <TextInput
        style={styles.input}
        placeholder="Account Number"
        value={bankAccountNumber}
        onChangeText={setBankAccountNumber}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Routing Number"
        value={bankRoutingNumber}
        onChangeText={setBankRoutingNumber}
        keyboardType="numeric"
      />

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Enable Automatic Transfers</Text>
        <Switch
          value={enableAutoTransfer}
          onValueChange={setEnableAutoTransfer}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSaveBankAccount}>
        <Text style={styles.buttonText}>Save Bank Account</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => {
          setShowDashboard(true);
          setShowBankAccountSetup(false);
        }}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render payment confirmation screen
  const renderPaymentConfirmation = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Payment Successful!</Text>
      <Text style={styles.subtitle}>
        Amount: ${parseFloat(amount).toFixed(2)}
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleNewPayment}>
        <Text style={styles.buttonText}>New Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => {
          setShowDashboard(true);
          setShowPaymentScreen(false);
          setShowPaymentConfirmation(false);
        }}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render function
  return (
    <StripeProvider
      publishableKey="pk_test_51NXwqpLkdIwIvLOGVrYUEMXLjJcIy9X5xlmnCEEsjJ5mXWUZlt2NbLhcpHcjA1QQuyWwJ7jyRsZKpuBvRlQ2FvNs00Ht3wCkZP"
      merchantIdentifier="merchant.com.easypos"
      urlScheme="easypos"
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {!isLoggedIn ? (
          isRegistering ? renderRegistrationScreen() : renderLoginScreen()
        ) : showPaymentConfirmation ? (
          renderPaymentConfirmation()
        ) : showBankAccountSetup ? (
          renderBankAccountSetup()
        ) : showPaymentScreen ? (
          renderPaymentScreen()
        ) : (
          renderDashboardScreen()
        )}
      </SafeAreaView>
    </StripeProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#7f8c8d',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  amountInput: {
    width: '100%',
    height: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 30,
    paddingHorizontal: 15,
    fontSize: 36,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  dashboardButton: {
    width: '100%',
    height: 70,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoutButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#3498db',
    marginTop: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
});

export default App;
