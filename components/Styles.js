import { StyleSheet } from "react-native";

export const colors = {
  primary: "#212121",
  secondary: "#2a2a2a",
  brand: "#D9D9D9",
  background: "#1a1a1a",
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    paddingHorizontal: 32,
    paddingVertical:24,

    flex:1,
    backgroundColor: colors.background,
  
  },
  textPrimary: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  textTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.brand,
  },

  textNormal: {
    fontSize: 16,
    color: "white",
  },

  textFooter: {
    fontSize: 8,
    color: "white",
  },


});