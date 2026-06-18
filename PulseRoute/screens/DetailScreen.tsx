import React from 'react';
import { View, Text } from 'react-native';

export default function DetailScreen({ route }: any) {
  const { delivery } = route.params;

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        paddingTop: 50,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 20,
        }}
      >
        Delivery Details
      </Text>

      <Text>ID: {delivery.id}</Text>
      <Text>Customer: {delivery.customer}</Text>
      <Text>Address: {delivery.address}</Text>
      <Text>Status: {delivery.status}</Text>
    </View>
  );
}