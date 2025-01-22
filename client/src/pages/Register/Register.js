import React, { useState, useEffect } from 'react';
import './Register.css';
import axios from '../../API/axios';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (Object.keys(formErrors).length === 0 && isSubmitting) {
      handleRegister();
    }
  }, [formErrors, isSubmitting]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormErrors((prevErrors) => ({ ...prevErrors, [e.target.name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
    } else {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post('/register', formData);
      setIsSuccess(true);
    } catch (error) {
      setFormErrors({ general: error.response?.data?.message || 'Registration failed' });
    }
    setIsSubmitting(false);
  };

  if (isSuccess) {
    return (
      <div className="success-screen">
        <h2>Registration Successful!</h2>
        <p>You can now <a href="#">Sign in</a>.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Register</h2>
      {formErrors.general && <p className="error">{formErrors.general}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} />
          {formErrors.username && <p className="error">{formErrors.username}</p>}
        </div>
        <div>
          <label>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} />
          {formErrors.email && <p className="error">{formErrors.email}</p>}
        </div>
        <div>
          <label>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} />
          {formErrors.password && <p className="error">{formErrors.password}</p>}
        </div>
        <div>
          <label>Confirm Password</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
          {formErrors.confirmPassword && <p className="error">{formErrors.confirmPassword}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>Register</button>
      </form>
      <p>Already registered? <a href="#">Sign in</a></p>
    </div>
  );
};

export default Register;
