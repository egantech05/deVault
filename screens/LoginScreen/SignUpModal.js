import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../components/Styles';

const successModalShadow = Platform.select({
  web: {
    boxShadow: '0px 4px 16px rgba(0,0,0,0.25)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default function SignUpModal({ visible, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    });
    setErrors({});
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasCapital = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return {
      isValid: minLength && hasCapital && hasSymbol,
      errors: {
        length: !minLength ? 'Password must be at least 8 characters' : null,
        capital: !hasCapital ? 'Password must contain at least one capital letter' : null,
        symbol: !hasSymbol ? 'Password must contain at least one symbol' : null,
      }
    };
  };

  const checkEmailExists = async (email) => {
    try {
      // Use a more reliable method to check email existence
      const { data, error } = await supabase.auth.admin.getUserByEmail(email.trim());
      
      // If we get data, email exists
      if (data && data.user) {
        return true;
      }
      
      // If error is "User not found", email doesn't exist
      if (error && error.message.includes('User not found')) {
        return false;
      }
      
      // For other errors, assume email doesn't exist to allow signup
      return false;
    } catch (error) {
      // If there's any error, assume email doesn't exist
      return false;
    }
  };

  const validateForm = async () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    } else {
      // Check if email already exists
      try {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          newErrors.email = 'This email is already registered';
        }
      } catch (error) {
        newErrors.email = 'Error checking email availability';
      }
    }
    
    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = Object.values(passwordValidation.errors).filter(Boolean).join(', ');
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!(await validateForm())) {
      return;
    }
    
    setLoading(true);
    try {
      console.log('🚀 Starting signup process...');
      console.log('📧 Email:', formData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
          }
        }
      });
  
      console.log('📊 Signup response - data:', data);
      console.log('📊 Signup response - error:', error);
      console.log('📊 User created:', data?.user);
      console.log('📊 Session:', data?.session);
  
      if (error) {
        console.error('❌ Signup error:', error);
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          Alert.alert('Sign Up Failed', 'This email is already registered. Please use a different email or try logging in.');
        } else {
          Alert.alert('Sign Up Failed', error.message);
        }
      } else {
        console.log('✅ Signup successful!');
        console.log('✅ User ID:', data?.user?.id);
        console.log('✅ Email confirmed:', data?.user?.email_confirmed_at);
        
        // Show custom success modal instead of Alert.alert
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('💥 Signup catch error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    handleClose();
    onSuccess?.();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Account</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.brand} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                
                {/* Password Requirements */}
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                  <Text style={[styles.requirement, formData.password.length >= 8 && styles.requirementMet]}>
                    • At least 8 characters
                  </Text>
                  <Text style={[styles.requirement, /[A-Z]/.test(formData.password) && styles.requirementMet]}>
                    • One capital letter
                  </Text>
                  <Text style={[styles.requirement, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) && styles.requirementMet]}>
                    • One symbol
                  </Text>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateFormData('confirmPassword', value)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              {/* Name Inputs */}
              <View style={styles.nameRow}>
                <View style={[styles.inputGroup, styles.nameInput]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={[styles.input, errors.firstName && styles.inputError]}
                    placeholder="First name"
                    placeholderTextColor="#999"
                    value={formData.firstName}
                    onChangeText={(value) => updateFormData('firstName', value)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>

                <View style={[styles.inputGroup, styles.nameInput]}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={[styles.input, errors.lastName && styles.inputError]}
                    placeholder="Last name"
                    placeholderTextColor="#999"
                    value={formData.lastName}
                    onChangeText={(value) => updateFormData('lastName', value)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>



        {/* Success Modal */}
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={handleSuccessClose}
    >
      <View style={styles.successModalOverlay}>
        <View style={styles.successModal}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#28a745" />
          </View>
          <Text style={styles.successTitle}>Account Created Successfully! 🎉</Text>
          <Text style={styles.successMessage}>
            Welcome to Ssetra, {formData.firstName}!
          </Text>
          <Text style={styles.successSubMessage}>
            Please check your email ({formData.email}) for a confirmation link to activate your account.
          </Text>
          <TouchableOpacity 
            style={styles.successButton} 
            onPress={handleSuccessClose}
          >
            <Text style={styles.successButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    height: '85%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
    marginBottom: 0,
  },
  label: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  requirementsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  requirement: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  requirementMet: {
    color: '#28a745',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexShrink: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: 'bold',
  },
  signUpButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,    
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },

  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    ...successModalShadow,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  successButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
