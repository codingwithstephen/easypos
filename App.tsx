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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Check if user is already logged in using AsyncStorage
  useEffect(() => {
    const checkLoggedInUser = async () => {
      const savedUser = await storage.getItem('user');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
          setIsLoggedIn(true);
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
        // Store user data in AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(user));

        setCurrentUser(user);
        setIsLoggedIn(true);
      } else {
        // Try to get users from AsyncStorage to check if the user exists there
        const storedUsersJson = await AsyncStorage.getItem('users');
        if (storedUsersJson) {
          const storedUsers = JSON.parse(storedUsersJson);
          const storedUser = storedUsers.find(
            (u) => u.username === username && u.password === password
          );

          if (storedUser) {
            // Store current user in AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(storedUser));

            setCurrentUser(storedUser);
            setIsLoggedIn(true);
            return;
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
      };

      // Get existing users from AsyncStorage or create empty array
      const storedUsersJson = await AsyncStorage.getItem('users');
      let users = [];

      if (storedUsersJson) {
        users = JSON.parse(storedUsersJson);

        // Check if username already exists
        const userExists = users.some(user => user.username === username);
        if (userExists) {
          Alert.alert('Registration Failed', 'Username already exists');
          return;
        }
      }

      // Add new user to users array
      users.push(newUser);

      // Save updated users array to AsyncStorage
      await AsyncStorage.setItem('users', JSON.stringify(users));

      // Save current user to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(newUser));

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
    try {
      // Clear user from AsyncStorage
      await AsyncStorage.removeItem('user');

      // Update state
      setIsLoggedIn(false);
      setCurrentUser(null);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setMerchantName('');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout Error', 'An error occurred during logout. Please try again.');
    }
  };

  // Handle payment processing
  const handleProcessPayment = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    // Simulate payment processing
    setTimeout(() => {
      setShowPaymentConfirmation(true);
    }, 1000);
  };

  // Reset payment
  const handleNewPayment = () => {
    setAmount('');
    setShowPaymentConfirmation(false);
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

  // Render payment screen
  const renderPaymentScreen = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>EasyPOS</Text>
      <Text style={styles.subtitle}>
        Welcome, {currentUser?.merchantName || 'Merchant'}
      </Text>

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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
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

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render function
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {!isLoggedIn ? (
        isRegistering ? renderRegistrationScreen() : renderLoginScreen()
      ) : showPaymentConfirmation ? (
        renderPaymentConfirmation()
      ) : (
        renderPaymentScreen()
      )}
    </SafeAreaView>
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
});

export default App;
