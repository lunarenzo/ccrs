import { createStyles } from '../../utils/createStyles';
import { GenericTheme } from '../../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 8,
    minHeight: 20,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 8,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: theme.colors.text,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: theme.colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // Dynamic styles for status
  completedIcon: {
    backgroundColor: theme.colors.primary,
  },
  incompleteIcon: {
    backgroundColor: theme.colors.border,
  },
  completedIconText: {
    color: theme.colors.white,
  },
  incompleteIconText: {
    color: theme.colors.textSecondary,
  },
  completedConnector: {
    backgroundColor: theme.colors.primary,
  },
  incompleteConnector: {
    backgroundColor: theme.colors.border,
  },
  completedLabel: {
    color: theme.colors.text,
  },
  incompleteLabel: {
    color: theme.colors.textSecondary,
  },
  currentLabel: {
    fontWeight: '600',
  },
  completedDescription: {
    color: theme.colors.textSecondary,
  },
  incompleteDescription: {
    color: theme.colors.textSecondary,
  },
}));
