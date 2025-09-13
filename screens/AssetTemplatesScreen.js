import React,{useState} from "react";
import { View, Text,StyleSheet, ScrollView, useWindowDimensions,TextInput } from "react-native";
import { colors, commonStyles } from "../components/styles";
import { Ionicons } from '@expo/vector-icons';

export default function AssetTemplatesScreen() {
  const {width} = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');

  //calculate card size to make it responsive

  const getCardSize=() =>{
    const containerPadding= 0;
    const availableWidth= width - containerPadding;
    const margin = 8; 

    //calculate how many cards can fit
    let cardsPerRow=1;
    if (availableWidth >= 100) cardsPerRow = 2;
    if (availableWidth >= 200) cardsPerRow = 3;
    if (availableWidth >= 600) cardsPerRow = 4;
    if (availableWidth >= 800) cardsPerRow = 5;
    if (availableWidth >= 1000) cardsPerRow = 8;

    const cardSize = width/ cardsPerRow+16;
    return Math.max(cardSize, 60);

  };

  const cardSize= getCardSize();
  const addIconSize= 0.5*cardSize;

  

  return (
    
      <View style={commonStyles.contentContainer}>
       <Text style={commonStyles.textPrimary}>Asset Templates</Text>
       <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
           <View style={[styles.searchBar]}>
              <Ionicons name="search" size={16} color={"white"} />
              <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={"white"} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
        
          <View  style={styles.displayCardContainer}>

            <View style={[styles.addCard, {width:cardSize, height:cardSize}]}>
              <Ionicons name="add" size={addIconSize} color= {colors.brand}/>
            </View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}>
              <Text style={[styles.countText, {fontSize: cardSize * 0.10}]}>10</Text>
              <View style={styles.nameTextWrap}>
                <Text style={[styles.nameText, {fontSize: cardSize * 0.15}]}>Drone</Text>
              </View>
            </View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>
            <View style={[styles.displayCard, {width:cardSize, height:cardSize}]}></View>

          </View>
       </ScrollView>
      </View>
   
  );
}

export const styles= StyleSheet.create({
  scrollContainer:{
    flex:1,
  },
  displayCardContainer:{

    flex:1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",

  },

  searchBar:{

    padding:16,
    borderColor: "white",
    borderBottomWidth:3,
    height:55,
    flexDirection: 'row',
  },

  searchInput:{
    color:'white',
    marginLeft: 16,
    flex:1,
   
  },
  displayCard:{
    backgroundColor: "white",
    padding:12,
    borderRadius: 13,
    margin:8,
  },

  addCard:{
    backgroundColor: colors.secondary,
    padding:12,
    borderRadius: 13,
    margin:8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  countText:{
    alignSelf:'flex-end',
    fontWeight: 'bold',
  },

  nameText:{

      fontWeight: 'bold',
  },

  nameTextWrap:{
      flex:1,
      justifyContent:'flex-end',
  },


})