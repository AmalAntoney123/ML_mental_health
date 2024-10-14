import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import RNFS from 'react-native-fs';

interface SleepMusic {
    id: string;
    title: string;
    artist: string;
    fileUrl: string;
}

const ManageSleepMusicScreen: React.FC = () => {
    const [sleepMusic, setSleepMusic] = useState<SleepMusic[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newArtist, setNewArtist] = useState('');
    const [selectedFile, setSelectedFile] = useState<DocumentPickerResponse | null>(null);
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { colors } = useTheme();

    useEffect(() => {
        fetchSleepMusic();
    }, []);

    const fetchSleepMusic = async () => {
        const musicRef = database().ref('sleepMusic');
        const snapshot = await musicRef.once('value');
        const musicData = snapshot.val();
        if (musicData) {
            const musicList: SleepMusic[] = Object.entries(musicData).map(([id, data]: [string, any]) => ({
                id,
                title: data.title,
                artist: data.artist,
                fileUrl: data.fileUrl,
            }));
            setSleepMusic(musicList);
        }
    };

    const handleFilePick = async () => {
        try {
            const result = await DocumentPicker.pick({
                type: [DocumentPicker.types.audio],
            });
            setSelectedFile(result[0]);
        } catch (err) {
            if (DocumentPicker.isCancel(err)) {
                // User cancelled the picker
            } else {
                console.error('Error picking document:', err);
            }
        }
    };

    const handleAddMusic = async () => {
        if (newTitle && newArtist && selectedFile) {
            try {
                setIsUploading(true);
                setUploadProgress(0);

                const fileName = selectedFile.name || 'unnamed_file';
                const fileExtension = fileName.split('.').pop();
                const newFileName = `${Date.now()}.${fileExtension}`;

                // Copy file to app's temporary directory
                const tempFilePath = `${RNFS.TemporaryDirectoryPath}/${newFileName}`;
                await RNFS.copyFile(selectedFile.uri, tempFilePath);

                // Create a reference to the file location in Firebase Storage
                const reference = storage().ref(`sleepMusic/${newFileName}`);

                // Upload the file to Firebase Storage
                const task = reference.putFile(tempFilePath);

                // Monitor the upload task
                task.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                        console.log(`Upload is ${progress.toFixed(2)}% done`);
                    },
                    (error) => {
                        setIsUploading(false);
                        setUploadProgress(0);
                        console.error('Upload failed:', error);
                        Alert.alert('Error', 'Failed to upload file. Please try again.');
                    },
                    async () => {
                        try {
                            // Upload completed successfully
                            const fileUrl = await reference.getDownloadURL();

                            // Add music data to Realtime Database
                            const musicRef = database().ref('sleepMusic').push();
                            await musicRef.set({
                                title: newTitle,
                                artist: newArtist,
                                fileUrl: fileUrl,
                            });

                            console.log('Music data added to Realtime Database');

                            // Clean up the temporary file
                            await RNFS.unlink(tempFilePath);

                            setNewTitle('');
                            setNewArtist('');
                            setSelectedFile(null);
                            setIsUploading(false);
                            setUploadProgress(0);
                            await fetchSleepMusic();
                            setActiveTab('list');
                            Alert.alert('Success', 'Music added successfully!');
                        } catch (dbError) {
                            console.error('Error adding to Realtime Database:', dbError);
                            Alert.alert('Error', 'Failed to add music details. Please try again.');
                        }
                    }
                );
            } catch (error) {
                setIsUploading(false);
                setUploadProgress(0);
                console.error('Error adding music:', error);
                Alert.alert('Error', 'Failed to add music. Please try again.');
            }
        } else {
            Alert.alert('Error', 'Please fill in all fields and select an MP3 file');
        }
    };

    const handleDeleteMusic = async (id: string, fileUrl: string) => {
        Alert.alert(
            'Delete Music',
            'Are you sure you want to delete this music?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: async () => {
                        try {
                            // Delete file from Firebase Storage
                            await storage().refFromURL(fileUrl).delete();

                            // Delete data from Realtime Database
                            await database().ref(`sleepMusic/${id}`).remove();

                            fetchSleepMusic();
                        } catch (error) {
                            console.error('Error deleting music:', error);
                            Alert.alert('Error', 'Failed to delete music. Please try again.');
                        }
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    };

    const renderMusicItem = ({ item }: { item: SleepMusic }) => (
        <View style={[styles.musicItem, { backgroundColor: colors.surface }]}>
            <View style={styles.musicInfo}>
                <Text style={[styles.musicTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.musicArtist, { color: colors.text }]}>{item.artist}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteMusic(item.id, item.fileUrl)}>
                <Icon name="delete" size={24} color={colors.error} />
            </TouchableOpacity>
        </View>
    );

    const renderAddMusicForm = useCallback(() => (
        <View style={styles.addMusicContainer}>
            <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Title"
                placeholderTextColor={colors.text}
                value={newTitle}
                onChangeText={setNewTitle}
            />
            <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Artist"
                placeholderTextColor={colors.text}
                value={newArtist}
                onChangeText={setNewArtist}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleFilePick}>
                <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>
                    {selectedFile ? 'File selected' : 'Select MP3 File'}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.primary }]} 
                onPress={handleAddMusic}
                disabled={isUploading}
            >
                <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>Add Music</Text>
            </TouchableOpacity>
            {isUploading && (
                <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.uploadingText, { color: colors.text }]}>
                        Uploading... {uploadProgress.toFixed(0)}%
                    </Text>
                </View>
            )}
        </View>
    ), [newTitle, newArtist, selectedFile, isUploading, uploadProgress, colors]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Manage Sleep Music</Text>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'list' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setActiveTab('list')}
                >
                    <Text style={[styles.tabButtonText, { color: activeTab === 'list' ? colors.onPrimary : colors.text }]}>
                        Music List
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'add' && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setActiveTab('add')}
                >
                    <Text style={[styles.tabButtonText, { color: activeTab === 'add' ? colors.onPrimary : colors.text }]}>
                        Add Music
                    </Text>
                </TouchableOpacity>
            </View>
            {activeTab === 'list' ? (
                <FlatList
                    data={sleepMusic}
                    renderItem={renderMusicItem}
                    keyExtractor={(item) => item.id}
                    style={styles.musicList}
                />
            ) : (
                renderAddMusicForm()
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 8,
        marginHorizontal: 5,
    },
    tabButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    addMusicContainer: {
        marginBottom: 20,
    },
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    addButton: {
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    musicList: {
        flex: 1,
    },
    musicItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    musicInfo: {
        flex: 1,
    },
    musicTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    musicArtist: {
        fontSize: 14,
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    uploadingText: {
        marginLeft: 10,
        fontSize: 16,
    },
});

export default ManageSleepMusicScreen;
