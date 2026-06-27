import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';

export const fontAssets = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
  DMMono_400Regular,
  DMMono_500Medium,
};

// Brand type system: Poppins carries display + UI + body; DM Mono is the
// uppercase "eyebrow"/metadata accent. Keys stay stable so existing styles
// repoint automatically.
export const fonts = {
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodySemiBold: 'Poppins_600SemiBold',
  bodyBold: 'Poppins_700Bold',
  bodyExtraBold: 'Poppins_800ExtraBold',
  display: 'Poppins_800ExtraBold',
  displayRegular: 'Poppins_400Regular',
  displayMedium: 'Poppins_500Medium',
  displaySemiBold: 'Poppins_600SemiBold',
  displayExtraBold: 'Poppins_900Black',
  // DM Mono accent (eyebrows, labels, metadata)
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
};
