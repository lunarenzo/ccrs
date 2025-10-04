import { createStyles } from '../../utils/createStyles';

export const useStyles = createStyles(theme => ({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    color: theme.colors.white,
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    color: theme.colors.white,
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  countdownText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  privacyNote: {
    marginTop: 16,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  emergencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
}));
