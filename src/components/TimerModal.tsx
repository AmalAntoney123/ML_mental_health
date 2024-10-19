import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';

interface TimerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSetTimer: (minutes: number | null) => void;
  currentTimer: number | null;
}

const TimerModal: React.FC<TimerModalProps> = ({ isVisible, onClose, onSetTimer, currentTimer }) => {
  const { colors } = useTheme();
  const [customTime, setCustomTime] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const handleCustomTimeSet = () => {
    const minutes = parseInt(customTime, 10);
    if (!isNaN(minutes) && minutes > 0) {
      onSetTimer(minutes);
      onClose();
    }
  };

  const handlePresetChange = (value: number | null) => {
    setSelectedPreset(value);
    if (value !== null) {
      onSetTimer(value);
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Set Timer</Text>
          
          <View style={styles.timerInputContainer}>
            <TextInput
              style={[styles.timerInput, { color: colors.text, borderColor: colors.border }]}
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="Custom time (min)"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.timerButton, { backgroundColor: colors.primary }]}
              onPress={handleCustomTimeSet}
            >
              <Text style={styles.timerButtonText}>Set</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPreset}
              style={[styles.picker, { color: colors.text }]}
              onValueChange={handlePresetChange}
            >
              <Picker.Item label="Select preset" value={null} />
              <Picker.Item label="15 minutes" value={15} />
              <Picker.Item label="30 minutes" value={30} />
              <Picker.Item label="45 minutes" value={45} />
              <Picker.Item label="60 minutes" value={60} />
            </Picker>
          </View>
          
          <TouchableOpacity
            style={[styles.offButton, { backgroundColor: currentTimer === null ? colors.primary : colors.background }]}
            onPress={() => {
              onSetTimer(null);
              onClose();
            }}
          >
            <Text style={[styles.offButtonText, { color: currentTimer === null ? 'white' : colors.text }]}>Turn Off Timer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.error }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  timerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  timerInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  timerButton: {
    padding: 10,
    borderRadius: 5,
  },
  timerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
  },
  offButton: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  offButtonText: {
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TimerModal;
