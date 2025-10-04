import { createStyles } from '../../utils/createStyles';
import { GenericTheme } from '../../constants/theme';

export const useStyles = createStyles((theme: GenericTheme) => ({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: 100,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  selectedButtonText: {
    color: theme.colors.white,
  },
  iconImage: {
    width: 32,
    height: 32,
    tintColor: theme.colors.primary,
  },
  selectedIconImage: {
    tintColor: theme.colors.white,
  },
  formContainer: {
    marginTop: 24,
  },
  subcategoryContainer: {
    marginBottom: 20,
  },
  subcategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: theme.colors.text, // For Android
  },
  pickerItem: {
    color: theme.colors.text, // For iOS
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    color: theme.colors.text,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
  },
  disabledButton: {
    backgroundColor: theme.colors.gray,
  },
}));
