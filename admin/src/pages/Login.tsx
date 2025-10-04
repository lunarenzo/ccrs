import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Silent redirect based on user role after authentication
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Silent redirect to appropriate dashboard without revealing other routes exist
      const redirectPath = user.role === 'desk_officer' ? '/desk' : '/';
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Don't navigate here - let the useEffect handle navigation after auth state changes
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials and ensure you have admin privileges.');
      setLoading(false);
    }
  };

  // Show loading state while authentication is processing
  if (authLoading || (isAuthenticated && user)) {
    return (
      <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-ccrs-gray">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-ccrs-secondary">Authenticating...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-ccrs-gray">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card className="shadow-ccrs-lg">
            <CardHeader className="text-center bg-ccrs-light border-ccrs">
              <CardTitle className="h3 text-ccrs-primary mb-2">
                CCRS Admin
              </CardTitle>
              <p className="text-ccrs-secondary mb-0">
                Sign in to access the admin dashboard
              </p>
            </CardHeader>
            
            <CardContent>
              <Form onSubmit={handleSubmit}>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                {error && (
                  <Alert variant="danger" className="py-2">
                    <small>{error}</small>
                  </Alert>
                )}

                <Alert variant="info" className="py-2 mb-3">
                  <small>
                    <strong>Test Accounts:</strong><br />
                    Admin: admin@example.com / admin123<br />
                    Desk Officer: desk.officer@test.com / TestPass123!
                  </small>
                </Alert>

                <div className="d-grid">
                  <Button
                    type="submit"
                    disabled={loading || authLoading}
                    variant="primary"
                    size="lg"
                  >
                    {(loading || authLoading) ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;
