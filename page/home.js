import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Switch, useColorScheme } from 'react-native';
import { NetworkScanner } from '../tmp';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { DeviceScanner } from '../components/DeviceScanner';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <DeviceScanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#32b8a0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#eeeeee',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  list: {
    flex: 1,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedDeviceItem: {
    backgroundColor: '#a0ddd2ed',
    borderColor: '#1890ff',
    borderWidth: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deviceHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  versionButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
  },
});
