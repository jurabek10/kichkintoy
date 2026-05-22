import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Kichkintoy Mobile</Text>
        <Text style={styles.title}>Kichkintoy</Text>
        <Text style={styles.body}>
          Parent and teacher mobile app shell for kindergarten communication in
          Uzbekistan.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f6f7f9"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#dce2ea",
    borderWidth: 1
  },
  eyebrow: {
    marginBottom: 12,
    color: "#28775f",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    marginBottom: 12,
    color: "#17202a",
    fontSize: 36,
    fontWeight: "800"
  },
  body: {
    color: "#465565",
    fontSize: 17,
    lineHeight: 26
  }
});
