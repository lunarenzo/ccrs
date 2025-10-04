import { createStyles } from '../../utils/createStyles';

export const useStyles = createStyles(theme => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLoadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  locationRetryText: {
    fontSize: 14,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  submissionErrorContainer: {
    backgroundColor: theme.colors.dangerLight,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
  },
  submissionErrorText: {
    color: theme.colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  hotlineContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  hotlineText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: theme.colors.text,
  },
  modalButton: {
    backgroundColor: theme.colors.lightGray,
    padding: 15,
    borderRadius: theme.borderRadius.md,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalCancelButton: {
    backgroundColor: theme.colors.danger,
    padding: 15,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}));
