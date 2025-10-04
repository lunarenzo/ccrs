import { createStyles } from '../../utils/createStyles';
import { GenericTheme } from '../../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIconContainer: {
    marginBottom: 12,
  },
  shieldIcon: {
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
    padding: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
}));
