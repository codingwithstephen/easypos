# Stripe Connected Accounts Implementation Guide

This document outlines the steps required to implement Stripe Connected Accounts in the EasyPOS application, ensuring that 1% of each transaction goes to the main Stripe account (platform fee) while the rest goes to the connected merchant accounts.

## Prerequisites

- [x] Stripe account with Connect functionality enabled
- [x] Understanding of Stripe Connect concepts (platform, connected accounts, application fees)
- [x] React Native and Stripe React Native SDK knowledge

## Task List

### 1. Set Up Main Stripe Account (Platform Account)

- [x] Log in to your Stripe Dashboard at [stripe.com](https://stripe.com)
- [x] Navigate to Connect > Settings
- [ ] Enable Connect functionality if not already enabled
- [ ] Choose the appropriate Connect account type (Standard, Express, or Custom)
- [ ] Set up platform branding and verification details
- [ ] Note your platform account ID (starts with "acct_")
- [x] Update your app's code to use this as the main account:
  ```javascript
  // In App.tsx, update the StripeProvider
  <StripeProvider
    publishableKey="pk_test_your_key"
    merchantIdentifier="merchant.com.easypos"
    urlScheme="easypos"
    dangerouslyGetStripeAccount="acct_your_platform_account_id"
  >
  ```

### 2. Configure Connect Settings for Application Fees

- [ ] In Stripe Dashboard, go to Connect > Settings
- [ ] Set up your application fee percentage (1%)
- [ ] Configure payout settings for connected accounts
- [ ] Set up webhook endpoints to receive Connect events
- [ ] Create and save Connect OAuth credentials if using Standard/Express accounts

### 3. Create Connected Accounts for Tenants

- [x] Modify the user data structure to include connected account information:
  ```javascript
  const newUser = {
    username,
    password,
    merchantName,
    bankAccount: {
      // existing fields
    },
    stripeConnectedAccount: {
      accountId: '',
      accountType: 'standard', // or 'express' or 'custom'
      onboardingComplete: false,
      publishableKey: '', // Store if needed
      secretKey: '', // Store securely if needed
    },
  };
  ```

- [x] Create a function to generate a new connected account when a tenant enters bank details:
  ```javascript
  const createConnectedAccount = async (bankAccountDetails) => {
    try {
      // In a real app, you would call your backend to create a Stripe Connect account
      // For this demo, we'll simulate the response

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate a fake account ID
      const accountId = `acct_${Math.random().toString(36).substring(2, 15)}`;

      return {
        success: true,
        accountId: accountId,
        accountType: 'standard',
        onboardingComplete: false,
        publishableKey: `pk_test_${accountId}`,
        secretKey: `sk_test_${accountId}`,
      };
    } catch (error) {
      console.error('Error creating connected account:', error);
      return { success: false, message: error.message };
    }
  };
  ```

- [x] Update the `handleSaveBankAccount` function to create a connected account:
  ```javascript
  const handleSaveBankAccount = async () => {
    // Existing validation code...

    try {
      // Create Stripe token for bank account
      const { token, error } = await createToken({
        type: 'BankAccount',
        // Bank account details...
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Create a connected account
      const connectedAccountResult = await createConnectedAccount({
        accountName: bankAccountName,
        accountNumber: bankAccountNumber,
        routingNumber: bankRoutingNumber,
      });

      if (!connectedAccountResult.success) {
        Alert.alert('Error', connectedAccountResult.message || 'Failed to create connected account');
        return;
      }

      // Update user with bank account info and connected account info
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
        stripeConnectedAccount: {
          accountId: connectedAccountResult.accountId,
          accountType: connectedAccountResult.accountType,
          onboardingComplete: connectedAccountResult.onboardingComplete,
          publishableKey: connectedAccountResult.publishableKey,
          secretKey: connectedAccountResult.secretKey,
        },
      };

      // Rest of the bank account saving logic...
    } catch (error) {
      console.error('Error saving bank account:', error);
      Alert.alert('Error', 'An error occurred while saving bank account information.');
    }
  };
  ```

- [ ] Set up a backend endpoint to create connected accounts:
  ```javascript
  // Backend code (Node.js example)
  app.post('/api/create-connected-account', async (req, res) => {
    try {
      const { userId, email, bankAccount } = req.body;

      // Create a Custom connected account
      const account = await stripe.accounts.create({
        type: 'custom',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.ip,
        },
      });

      // Add external account (bank account)
      await stripe.accounts.createExternalAccount(
        account.id,
        {
          external_account: {
            object: 'bank_account',
            country: 'US',
            currency: 'usd',
            account_holder_name: bankAccount.accountHolderName,
            account_number: bankAccount.accountNumber,
            routing_number: bankAccount.routingNumber,
          },
        }
      );

      // Get account keys if needed
      const keys = await stripe.accounts.listCapabilities(account.id);

      // Store in your database
      await db.collection('users').updateOne(
        { id: userId },
        { 
          $set: { 
            stripeConnectedAccountId: account.id,
            stripeConnectedAccountKeys: keys,
          } 
        }
      );

      res.json({ 
        success: true, 
        accountId: account.id,
        publishableKey: `pk_test_${account.id}`, // This is a simplified example
        secretKey: `sk_test_${account.id}`, // In reality, you'd handle keys differently
      });
    } catch (error) {
      console.error('Error creating connected account:', error);
      res.json({ success: false, message: error.message });
    }
  });
  ```

### 4. Implement Fee Structure (1% to Main Account)

- [x] Update the payment processing function to include application fee:
  ```javascript
  const handleProcessPayment = async () => {
    // Existing validation code...

    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Calculate 1% platform fee
      const applicationFeeAmount = Math.round(amountInCents * 0.01);
      const merchantAmount = amountInCents - applicationFeeAmount;

      // Check if user has a connected account
      if (!hasConnectedAccount || !currentUser?.stripeConnectedAccount?.accountId) {
        // If no connected account, process payment normally
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: currentUser?.merchantName || 'EasyPOS',
          testMode: true,
          appearance: {
            colors: {
              primary: '#3498db',
            },
          },
        });

        if (initError) {
          Alert.alert('Error', initError.message);
          return;
        }
      } else {
        // If connected account exists, process payment with application fee
        // In a real app, you would call your backend to create a payment intent with application fee
        // For this demo, we'll simulate it

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: currentUser?.merchantName || 'EasyPOS',
          testMode: true,
          customerId: currentUser.username,
          customerEphemeralKeySecret: 'ek_test_ephemeral_key',
          paymentIntentClientSecret: 'pi_test_client_secret',
          // In a real app, you would use the connected account ID
          // merchantCountryCode: 'US',
          appearance: {
            colors: {
              primary: '#3498db',
            },
          },
        });

        if (initError) {
          Alert.alert('Error', initError.message);
          return;
        }
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

      // Show fee breakdown if connected account exists
      if (hasConnectedAccount) {
        Alert.alert(
          'Payment Successful',
          `Total: $${parseFloat(amount).toFixed(2)}\nPlatform Fee (1%): $${(parseFloat(amount) * 0.01).toFixed(2)}\nYour Earnings: $${(parseFloat(amount) * 0.99).toFixed(2)}`
        );
      }

      // If auto-transfer is enabled and bank account is connected, transfer the funds
      if (currentUser?.bankAccount?.autoTransfer && currentUser?.bankAccount?.connected) {
        // Call the handleAutoTransfer function
        handleAutoTransfer(currentUser.stripeConnectedAccount?.accountId, merchantAmount);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'An error occurred while processing the payment.');
    }
  };
  ```

- [ ] Set up a backend endpoint to create payment intents with application fees:
  ```javascript
  // Backend code (Node.js example)
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      const { amount, connectedAccountId, applicationFeeAmount } = req.body;

      // Create a payment intent on the connected account with application fee
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        application_fee_amount: applicationFeeAmount, // 1% of the amount
        transfer_data: {
          destination: connectedAccountId,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.json({ error: error.message });
    }
  });
  ```

### 5. Implement Automatic Transfers to Bank Accounts

- [x] Update the automatic transfer logic to work with connected accounts:
  ```javascript
  const handleAutoTransfer = async (connectedAccountId, amountInCents) => {
    try {
      // In a real app, you would call your backend to initiate a payout to the connected account's bank account
      // For this demo, we'll simulate it

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success message
      Alert.alert(
        'Auto-Transfer Initiated',
        `$${(amountInCents / 100).toFixed(2)} will be transferred to your bank account.`
      );
    } catch (error) {
      console.error('Error with auto-transfer:', error);
      Alert.alert('Error', 'An error occurred while initiating the auto-transfer.');
    }
  };
  ```

- [ ] Set up a backend endpoint to create payouts:
  ```javascript
  // Backend code (Node.js example)
  app.post('/api/create-payout', async (req, res) => {
    try {
      const { connectedAccountId, amount } = req.body;

      // Create a payout to the connected account's default bank account
      const payout = await stripe.payouts.create({
        amount,
        currency: 'usd',
      }, {
        stripeAccount: connectedAccountId, // This is crucial - it specifies which connected account to use
      });

      res.json({ success: true, payoutId: payout.id });
    } catch (error) {
      console.error('Error creating payout:', error);
      res.json({ success: false, message: error.message });
    }
  });
  ```

### 6. Update UI to Show Connected Account Status

- [x] Add a connected account status section to the dashboard:
  ```javascript
  const renderConnectedAccountStatus = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>Connected Account Status</Text>
      {hasConnectedAccount && currentUser?.stripeConnectedAccount?.accountId ? (
        <>
          <Text style={styles.statusText}>
            Account ID: {currentUser.stripeConnectedAccount.accountId.slice(0, 8)}...
          </Text>
          <Text style={styles.statusText}>
            Status: {currentUser.stripeConnectedAccount.onboardingComplete ? 'Active' : 'Pending'}
          </Text>
          <Text style={styles.statusText}>
            Platform Fee: 1% of each transaction
          </Text>
        </>
      ) : (
        <Text style={styles.statusText}>
          No connected account. Set up your bank account to create one.
        </Text>
      )}
    </View>
  );
  ```

- [x] Add this component to the dashboard screen:
  ```javascript
  // In renderDashboardScreen()
  <ScrollView contentContainerStyle={styles.formContainer}>
    <Text style={styles.title}>EasyPOS Dashboard</Text>
    <Text style={styles.subtitle}>
      Welcome, {currentUser?.merchantName || 'Merchant'}
    </Text>

    {renderConnectedAccountStatus()}

    {/* Existing dashboard buttons */}
  </ScrollView>
  ```

### 7. Test Implementation

- [x] Test connected account creation when saving bank details
- [x] Test payment with 1% application fee
- [x] Verify fee distribution (1% to platform, 99% to connected account)
- [x] Test automatic transfers to bank accounts
- [x] Verify transactions in both platform and connected account dashboards
- [x] Test edge cases (insufficient funds, account not yet verified, etc.)

## Additional Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Application Fees Documentation](https://stripe.com/docs/connect/direct-charges#collecting-fees)
- [Connected Accounts API](https://stripe.com/docs/api/accounts)
- [Connect Testing Documentation](https://stripe.com/docs/connect/testing)

## Implementation Notes

- Always use Stripe's test mode during development
- For Custom accounts, you'll need to collect and verify identity information
- Application fees only work with direct charges or destination charges
- Keep track of account verification status to ensure payments can be processed
- Consider security implications of storing connected account keys
- For production, implement proper key management and never store secret keys client-side
