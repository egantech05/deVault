
import React from "react";
import { View, Text, ScrollView,SafeAreaView } from "react-native";
import { commonStyles, colors } from "../components/styles";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

export default function AssetTemplatesScreen() {
  return (
   
    <SafeAreaView style={commonStyles.container}>
       <Header />
       <ScrollView style={commonStyles.contentContainer}>
        
       </ScrollView>
       <Footer/>

    </SafeAreaView>
  );
}
