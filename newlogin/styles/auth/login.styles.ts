import { createStyles } from '../../utils/createStyles';
import { GenericTheme } from '../../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
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
  authToggle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
    color: theme.colors.primary,
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
