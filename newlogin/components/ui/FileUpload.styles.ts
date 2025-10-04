import { createStyles } from '../../utils/createStyles';
import { GenericTheme } from '../../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.text,
  },
  uploadSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: theme.colors.warning,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.warning,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  uploadButtonLoading: {
    opacity: 0.8,
  },
  uploadButtonDisabled: {
    backgroundColor: theme.colors.gray,
    opacity: 0.6,
  },
  uploadText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  uploadedFilesContainer: {
    marginTop: 16,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  uploadedFilesTitle: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
}));
