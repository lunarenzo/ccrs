import { Dimensions } from 'react-native';
import { createStyles } from '../../utils/createStyles';

const { width: screenWidth } = Dimensions.get('window');

export const useStyles = createStyles(theme => ({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  alertContainer: {
    width: screenWidth - theme.spacing.lg * 2,
    maxWidth: 400,
    minWidth: 300,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm, 
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  button: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  destructiveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  defaultButtonText: {
    color: theme.colors.white,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
  destructiveButtonText: {
    color: theme.colors.danger,
  },
}));
