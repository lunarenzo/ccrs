import { StyleSheet } from 'react-native';
import { GenericTheme } from '../constants/theme';

export function createStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  styleFactory: (theme: GenericTheme) => T
) {
  return (theme: GenericTheme): T => {
    return StyleSheet.create(styleFactory(theme));
  };
}

