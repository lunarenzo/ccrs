import { createStyles } from '../../utils/createStyles';

export const useStyles = createStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.text,
  },
  userSubtitle: {
    color: theme.colors.textSecondary,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: 4,
    marginRight: 10,
  },
  editButton: {
    marginLeft: 10,
  },
  actionIcon: {
    marginLeft: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    color: theme.colors.text,
  },
  detailValue: {
    fontWeight: '500',
    color: theme.colors.text,
  },
  uid: {
    fontWeight: '500',
    fontFamily: 'monospace',
    color: theme.colors.text,
  },
  settingsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.colors.text,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingsRowText: {
    color: theme.colors.text,
  },
  signOutButton: {
    backgroundColor: theme.colors.danger,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  createAccountButton: {
    backgroundColor: theme.colors.lightGray,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  createAccountButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  hotline: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  version: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
}));
