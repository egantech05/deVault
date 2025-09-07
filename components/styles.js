import { StyleSheet } from "react-native";

export const colors = {
  primary: "#212121",
  secondary: "#464545",
  brand: "#D9D9D9",
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  contentContainer: {
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: "red",
  },
  textPrimary: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
  },
  textTitle:{
    fontSize:24,
    fontWeight: "bold",
    color: colors.brand,
  },

  textFooter:{
    fontSize: 8,
    color: 'white',
    
  },
});
