import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
} from 'react-native';

const deliveries = [
  {
    id: 'PR-1001',
    customer: 'Alice Johnson',
    address: 'MG Road, Bangalore',
    status: 'Pending',
  },
  {
    id: 'PR-1002',
    customer: 'Bob Smith',
    address: 'Indiranagar, Bangalore',
    status: 'In Transit',
  },
  {
    id: 'PR-1003',
    customer: 'Charlie Brown',
    address: 'Koramangala, Bangalore',
    status: 'Delivered',
  },
];

export default function DashboardScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(true); // ✅ moved inside component

  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 50 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        PulseRoute 🚚
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </Text>
        <Switch value={isOnline} onValueChange={setIsOnline} />
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Detail', { delivery: item })}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>{item.id}</Text>
              <Text>{item.customer}</Text>
              <Text>{item.address}</Text>
              <Text style={{ marginTop: 8 }}>Status: {item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}