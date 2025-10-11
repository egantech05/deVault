import React from "react";
import { View, Text, Pressable } from "react-native";
import { commonStyles, colors } from "./Styles";
import { StyleSheet } from "react-native";


export const Footer = () => {
    return (
        <View style={localStyles.footer}>
            <Text style={commonStyles.textFooter}>powered by: egantech</Text>
            
        </View>
       
    );
};

export const localStyles = StyleSheet.create({
    footer: {
        //backgroundColor: colors.primary,
        justifyContent:"center",
        alignItems: "center",
        paddingVertical: 16,


    },


});