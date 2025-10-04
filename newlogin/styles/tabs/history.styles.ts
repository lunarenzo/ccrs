import { createStyles } from '../../utils/createStyles';
import { GenericTheme } from '../../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
  contentContainer: {
    padding: 20,
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  tryAgainButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  tryAgainButtonText: {
    color: theme.colors.textOnPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  reportItem: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  reportItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  categoryIcon: {
    width: 20,
    height: 20,
    marginRight: theme.spacing.sm,
  },
  categoryIconText: {
    marginRight: theme.spacing.sm,
    color: theme.colors.text,
  },
  categoryLabel: {
    flexShrink: 1,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  statusLabel: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  description: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  location: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
}));
