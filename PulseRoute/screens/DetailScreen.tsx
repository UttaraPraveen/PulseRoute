import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function DetailScreen({ route }: any) {
  const { delivery } = route.params;

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#f5f5f5',
      }}
    >
      <View
        style={{
          padding: 20,
          paddingTop: 30,
        }}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: 'bold',
            marginBottom: 20,
          }}
        >
          Delivery Details
        </Text>

        {/* Delivery Info Card */}

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: '#666',
              marginBottom: 8,
            }}
          >
            TRACKING INFORMATION
          </Text>

          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            {delivery.id}
          </Text>

          <Text>{delivery.customer}</Text>

          <Text>{delivery.address}</Text>

          <Text
            style={{
              marginTop: 10,
              fontWeight: '600',
            }}
          >
            Status: {delivery.status}
          </Text>

          <Text>Priority: Express</Text>
        </View>

        {/* Instructions */}

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: '#666',
              marginBottom: 10,
            }}
          >
            DROP-OFF INSTRUCTIONS
          </Text>

          <Text>
            Leave package with security desk if customer
            is unavailable.
          </Text>

          <Text
            style={{
              marginTop: 8,
            }}
          >
            Contact customer before marking delivery as failed.
          </Text>
        </View>

        {/* Map Placeholder */}

        <View
          style={{
            backgroundColor: '#dbeafe',
            height: 180,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
            }}
          >
            📍 Navigation Map Placeholder
          </Text>

          <Text>Live Driver Tracking Area</Text>
        </View>

        {/* Telemetry */}

        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: '#666',
              marginBottom: 10,
            }}
          >
            RECENT TELEMETRY
          </Text>

          <Text>🚗 Speed: 28 km/h</Text>
          <Text>🔋 Battery: 90%</Text>
          <Text>📶 Latency: 42 ms</Text>
          <Text>📍 GPS Active</Text>
        </View>
      </View>
    </ScrollView>
  );
}