import { createStyles } from '../utils/createStyles';
import { GenericTheme } from '../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonIcon: {
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  detailsContainer: {
    padding: 20,
  },
  detailsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 16,
    color: theme.colors.text,
  },
  categoryImage: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subCategoryLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailBlock: {
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  locationText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  internalDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonOnError: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.colors.card, // Assuming card color is a good contrast for primary
    fontSize: 16,
    fontWeight: 'bold',
  },
}));

export function getStatusColor(status: string, theme: GenericTheme) {
  const colors = {
    pending: { color: theme.colors.warning },
    validated: { color: theme.colors.info },
    responding: { color: theme.colors.secondary },
    resolved: { color: theme.colors.success },
    rejected: { color: theme.colors.danger },
  };
  return colors[status as keyof typeof colors] || { color: theme.colors.textSecondary };
}
