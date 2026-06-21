import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/common/language-switch';
import { AccountStep } from '@/components/signup/account-step';
import { CenterStep } from '@/components/signup/center-step';
import { ChildStep } from '@/components/signup/child-step';
import { SignupProvider, useSignup } from '@/components/signup/context';
import { CredentialsStep } from '@/components/signup/credentials-step';
import { RelationshipStep } from '@/components/signup/relationship-step';
import { ReviewStep } from '@/components/signup/review-step';
import { RoleStep } from '@/components/signup/role-step';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/utils';

function StepView() {
  const { step } = useSignup();
  switch (step) {
    case 'account':
      return <AccountStep />;
    case 'credentials':
      return <CredentialsStep />;
    case 'role':
      return <RoleStep />;
    case 'center':
      return <CenterStep />;
    case 'child':
      return <ChildStep />;
    case 'relationship':
      return <RelationshipStep />;
    case 'review':
      return <ReviewStep />;
  }
}

function Header() {
  const router = useRouter();
  const { stepIndex, stepCount, back } = useSignup();
  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => (stepIndex === 0 ? router.back() : back())} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <LanguageSwitch />
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View className="mt-3 flex-row gap-1">
        {Array.from({ length: stepCount }).map((_, index) => (
          <View
            key={index}
            className={cn('h-1 flex-1 rounded-full', index <= stepIndex ? 'bg-primary' : 'bg-segment')}
          />
        ))}
      </View>
    </View>
  );
}

export default function SignupScreen() {
  return (
    <SignupProvider>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <Header />
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
            <StepView />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SignupProvider>
  );
}
