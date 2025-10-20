import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from "react-native";
import { Picker } from '@react-native-picker/picker';
import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

import AntDesign from "@expo/vector-icons/build/AntDesign";

interface User {
    id: number;
    created_at: string;
    user_type: string;
    photoURL: string;
    email: string;
    name: string;
    bio: string;
    location: string;
    DOB: string;
}

interface MentorProfile {
    hourly_rate: number | null;
    skills: string[];
    specialization_roles: string[];
    experience_level: string;
    years_of_experience: number;
    teaching_style: string[];
    max_mentees: number;
    availability_hours_per_week: number | null;
    industries: string[];
    certifications: string[];
}

export default function UpdateProfile() {
    const [newDetail, setNewDetail] = useState({ Name: "", Bio: "", Role: "", DOB: "", Email: "", location: "" });
    const [mentorProfile, setMentorProfile] = useState<MentorProfile>({
        hourly_rate: null,
        skills: [],
        specialization_roles: [],
        experience_level: "Mid-level",
        years_of_experience: 0,
        teaching_style: [],
        max_mentees: 5,
        availability_hours_per_week: null,
        industries: [],
        certifications: []
    });
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);


    // Australian cities list
    const australianCities = [
        "Adelaide, SA",
        "Albany, WA",
        "Albury-Wodonga, NSW/VIC",
        "Alice Springs, NT",
        "Ballarat, VIC",
        "Bendigo, VIC",
        "Brisbane, QLD",
        "Broken Hill, NSW",
        "Broome, WA",
        "Bundaberg, QLD",
        "Bunbury, WA",
        "Cairns, QLD",
        "Canberra, ACT",
        "Coffs Harbour, NSW",
        "Darwin, NT",
        "Dubbo, NSW",
        "Geelong, VIC",
        "Geraldton, WA",
        "Gladstone, QLD",
        "Gold Coast, QLD",
        "Hervey Bay, QLD",
        "Hobart, TAS",
        "Kalgoorlie-Boulder, WA",
        "Launceston, TAS",
        "Mackay, QLD",
        "Mandurah, WA",
        "Melbourne, VIC",
        "Mildura, VIC",
        "Mount Gambier, SA",
        "Newcastle, NSW",
        "Orange, NSW",
        "Perth, WA",
        "Port Augusta, SA",
        "Port Hedland, WA",
        "Port Lincoln, SA",
        "Port Macquarie, NSW",
        "Rockhampton, QLD",
        "Shepparton, VIC",
        "Sunshine Coast, QLD",
        "Sydney, NSW",
        "Tamworth, NSW",
        "Toowoomba, QLD",
        "Townsville, QLD",
        "Traralgon, VIC",
        "Wagga Wagga, NSW",
        "Warrnambool, VIC",
        "Whyalla, SA",
        "Wollongong, NSW"
    ];
    const [imgUri, setImgUri] = useState<string | null>(null);
    const router = useRouter();


    // S3 details (read from Expo config / EAS secrets). Do NOT hardcode keys here.
    const S3_BUCKET = Constants.expoConfig?.extra?.AWS_S3_BUCKET_NAME ?? "";
    const AWS_REGION = Constants.expoConfig?.extra?.AWS_REGION ?? "ap-southeast-2";

    // Fetch session and user data
    useEffect(() => {
        async function fetchSession() {
            const currentSession = await supabase.auth.getSession();
            setSession(currentSession.data.session);
        }
        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => setSession(session)
        );
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Fetch user data
    useEffect(() => {
        async function fetchUser() {
            if (session && session.user) {
                setLoading(true);
                const { error, data } = await supabase.from("users").select("*").eq("email", session.user.email).single();
                if (!error) {
                    setUser(data);
                    setNewDetail({
                        Name: data.name || "",
                        Bio: data.bio || "",
                        Role: data.user_type || "",
                        DOB: data.DOB || "",
                        Email: data.email || "",
                        location: data.location || ""
                    });

                    // If user is a mentor, fetch mentor profile data
                    if (data.user_type?.toLowerCase() === "mentor") {
                        fetchMentorProfile(data.id);
                    }
                }
                setLoading(false);
            }
        }
        fetchUser();
    }, [session]);

    // Fetch mentor profile data
    async function fetchMentorProfile(userId: number) {
        const { data, error } = await supabase
            .from("mentors")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (!error && data) {
            setMentorProfile({
                hourly_rate: data.hourly_rate,
                skills: data.skills || [],
                specialization_roles: data.specialization_roles || [],
                experience_level: data.experience_level || "Mid-level",
                years_of_experience: data.years_of_experience || 0,
                teaching_style: data.teaching_style || [],
                max_mentees: data.max_mentees || 5,
                availability_hours_per_week: data.availability_hours_per_week,
                industries: data.industries || [],
                certifications: data.certifications || []
            });
        }
    }
    
   
   


    // Handle update
    const handleSubmit = async (email: string) => {
        console.log('🔄 Update initiated for:', email);
        console.log('📝 Current form data:', newDetail);
        console.log('👤 Current user data:', user);

        const updatedFields: any = {};

        // Always include all fields, even if empty (to allow clearing fields)
        if (newDetail.Name !== undefined && newDetail.Name !== (user?.name || "")) {
            updatedFields.name = newDetail.Name;
        }
        if (newDetail.Bio !== undefined && newDetail.Bio !== (user?.bio || "")) {
            updatedFields.bio = newDetail.Bio;
        }
        if (newDetail.Role !== undefined && newDetail.Role !== (user?.user_type || "")) {
            updatedFields.user_type = newDetail.Role;
        }
        if (newDetail.DOB !== undefined && newDetail.DOB !== (user?.DOB || "")) {
            updatedFields.DOB = newDetail.DOB;
        }
        if (newDetail.Email !== undefined && newDetail.Email !== (user?.email || "")) {
            updatedFields.email = newDetail.Email;
        }
        if (newDetail.location !== undefined && newDetail.location !== (user?.location || "")) {
            updatedFields.location = newDetail.location;
        }

        console.log('📦 Fields to update:', updatedFields);

        // Update user profile
        let userUpdateSuccess = true;
        if (Object.keys(updatedFields).length > 0) {
            console.log('💾 Sending user update to database...');
            const { error } = await supabase
                .from("users")
                .update(updatedFields)
                .eq("email", email);

            if (error) {
                console.log('❌ User update failed:', error.message);
                Alert.alert("Error", `Failed to update profile: ${error.message}`);
                userUpdateSuccess = false;
            }
        }

        // Update mentor profile if user is a mentor
        let mentorUpdateSuccess = true;
        if (user?.user_type?.toLowerCase() === "mentor" && userUpdateSuccess) {
            console.log('💾 Updating mentor profile...');
            const { error: mentorError } = await supabase
                .from("mentors")
                .update({
                    hourly_rate: mentorProfile.hourly_rate,
                    skills: mentorProfile.skills,
                    specialization_roles: mentorProfile.specialization_roles,
                    experience_level: mentorProfile.experience_level,
                    years_of_experience: mentorProfile.years_of_experience,
                    teaching_style: mentorProfile.teaching_style,
                    max_mentees: mentorProfile.max_mentees,
                    availability_hours_per_week: mentorProfile.availability_hours_per_week,
                    industries: mentorProfile.industries,
                    certifications: mentorProfile.certifications
                })
                .eq("user_id", user.id);

            if (mentorError) {
                console.log('❌ Mentor update failed:', mentorError.message);
                Alert.alert("Error", `Failed to update mentor profile: ${mentorError.message}`);
                mentorUpdateSuccess = false;
            }
        }

        if (userUpdateSuccess && mentorUpdateSuccess) {
            console.log('✅ Update successful');
            Alert.alert("Success", "Profile updated successfully!");
            setTimeout(() => {
                router.canGoBack() ? router.back() : router.push("/profile");
            }, 1000);
        }
    };


    // Handle cancel
    const handleCancel = () => {
        router.canGoBack() ? router.back() : router.push("/profile");
    };
    //details navigation
    const handleDetails = (itemName: string) => {
        if (itemName === "Mentor Settings") {
            router.push("./details"); // route to mentor-specific details page
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }
    const handlePress = (itemName: string) => {
        if (itemName === "Security Settings") {
            router.push("/PinLoginSettingsScreen");
        }
    };

    // ...existing code...
    // ...existing code...
async function handleAvatarPress(): Promise<void> {
    if (uploading) return;

    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Permission to access photos is required to update your avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        const localUri = (result as any).assets?.[0]?.uri ?? (result as any).uri;
        if (!localUri || (result as any).cancelled) return;

        setUploading(true);

        const filename = localUri.split('/').pop() || `avatar_${user?.id ?? Date.now()}`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const contentType =
            ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

        // React Native / Expo: response.blob() may not exist — use arrayBuffer() and Uint8Array
        const fileResp = await fetch(localUri);
        if (!fileResp.ok) throw new Error(`Could not read file: ${fileResp.status}`);
        const arrayBuffer = await fileResp.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const key = `avatars/${user?.id ?? 'anonymous'}/${Date.now()}.${ext}`;
        const s3Url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

        // Attempt direct PUT to S3 (only works if bucket policy/CORS allows / not recommended for production)
        try {
            const putResponse = await fetch(s3Url, {
                method: 'PUT',
                headers: {
                    'Content-Type': contentType,
                },
                body: uint8, // Uint8Array works as body in RN fetch
            });

            if (!putResponse.ok) {
                const bodyText = await putResponse.text().catch(() => '');
                throw new Error(`S3 PUT failed ${putResponse.status} ${bodyText}`);
            }

            const identifier = user?.email ?? session?.user?.email;
            if (identifier) {
                const { error } = await supabase.from('users').update({ photoURL: s3Url }).eq('email', identifier);
                if (error) {
                    console.warn('Failed updating photoURL in DB:', error);
                    Alert.alert('Warning', 'Uploaded to S3 but failed to update profile in DB.');
                } else {
                    setImgUri(s3Url);
                    setUser(prev => (prev ? { ...prev, photoURL: s3Url } : prev));
                    Alert.alert('Success', 'Profile picture uploaded to S3.');
                }
            } else {
                setImgUri(s3Url);
                Alert.alert('Success', 'Profile picture uploaded to S3 (local only).');
            }
            return;
        } catch (s3Err) {
            console.warn('S3 upload failed, will try Supabase storage fallback:', s3Err);
        }

        // Supabase fallback: upload raw Uint8Array (Supabase JS accepts ArrayBuffer/Uint8Array in RN)
        try {
            const storageBucket = 'avatars';
            const uploadPath = key;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(storageBucket)
                .upload(uploadPath, uint8, {
                    contentType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(uploadPath);
            const publicUrl = publicData?.publicUrl ?? '';

            if (!publicUrl) throw new Error('Could not get public URL from Supabase storage.');

            const identifier = user?.email ?? session?.user?.email;
            if (identifier) {
                const { error } = await supabase.from('users').update({ photoURL: publicUrl }).eq('email', identifier);
                if (error) {
                    console.warn('Failed updating photoURL in DB:', error);
                    Alert.alert('Warning', 'Uploaded to Supabase storage but failed to update profile in DB.');
                } else {
                    setImgUri(publicUrl);
                    setUser(prev => (prev ? { ...prev, photoURL: publicUrl } : prev));
                    Alert.alert('Success', 'Profile picture uploaded to Supabase storage (fallback).');
                }
            } else {
                setImgUri(publicUrl);
                Alert.alert('Success', 'Profile picture uploaded to Supabase storage (local only).');
            }
        } catch (fallbackErr) {
            console.error('Fallback upload failed:', fallbackErr);
            Alert.alert('Error', 'Failed to upload avatar. Check network, S3 CORS and storage settings.');
        }
    } catch (err) {
        console.error('Avatar upload error:', err);
        Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    } finally {
        setUploading(false);
    }
}
// ...existing code...
// ...existing code...
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                style={styles.scrollView}
            >
                <View style={styles.profileSection}>
                    <TouchableOpacity onPress={handleAvatarPress} disabled={uploading}>
                        <Image
                            style={styles.profileAvatar}
                            source={{ uri: imgUri || user?.photoURL || 'https://avatar.iran.liara.run/public/41' }}
                        />
                        {uploading && (
                            <ActivityIndicator
                                style={styles.uploadingIndicator}
                                size="large"
                                color="#3b82f6"
                            />
                        )}
                    </TouchableOpacity>
                </View>
                {user && (
                    <View style={styles.formContainer}>
                        {/* Common User Fields */}
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            value={newDetail.Name}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Name: text }))}
                            style={styles.input}
                            placeholderTextColor="#6b7280"
                        />

                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            value={newDetail.Bio}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Bio: text }))}
                            style={[styles.input, styles.multilineInput]}
                            placeholderTextColor="#6b7280"
                            multiline
                        />

                        <Text style={styles.label}>Date of Birth</Text>
                        <TextInput
                            value={newDetail.DOB}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, DOB: text }))}
                            style={styles.input}
                            placeholder="MM-DD-YYYY"
                            placeholderTextColor="#6b7280"
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            value={newDetail.Email}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Email: text }))}
                            style={styles.input}
                            keyboardType="email-address"
                            placeholderTextColor="#6b7280"
                        />

                        <Text style={styles.label}>Location</Text>
                        <TouchableOpacity
                            style={styles.pickerContainer}
                            onPress={() => setShowLocationPicker(!showLocationPicker)}
                        >
                            <Text style={[styles.pickerText, !newDetail.location && styles.placeholderText]}>
                                {newDetail.location || "Select your city"}
                            </Text>
                        </TouchableOpacity>

                        {showLocationPicker && (
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={newDetail.location}
                                    onValueChange={(itemValue) => {
                                        setNewDetail(prev => ({ ...prev, location: itemValue }));
                                        setShowLocationPicker(false);
                                    }}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Select your city" value="" />
                                    {australianCities.map((city, idx) => (
                                        <Picker.Item key={idx} label={city} value={city} />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        {/* Mentee-specific button */}
                        {user?.user_type?.toLowerCase() === "mentee" && (
                            <TouchableOpacity
                                onPress={() => router.dismissTo('/skills')}
                                style={{
                                    marginTop: 18,
                                    backgroundColor: '#faf8efff',
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    height: 48,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: '#40301eff',
                                    justifyContent: 'center',
                                    alignItems: 'center',

                                }}
                            >
                                <Text
                                    style={{ color: "#111827", fontSize: 16, fontWeight: "600" }}
                                >
                                    Add Skills and Interests
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.buttonRow}>
                            <TouchableOpacity onPress={handleCancel} style={[styles.button, styles.cancelButton]}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleSubmit(user.email)} style={[styles.button, styles.updateButton]}>
                                <Text style={styles.updateButtonText}>Update</Text>
                            </TouchableOpacity>
                        </View>

                        {/* --- PIN Section --- */}
                        <View style={{ marginTop: 8 }}>
                            <TouchableOpacity
                                onPress={() => handlePress("Security Settings")}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: 18,
                                    backgroundColor: '#faf8efff',
                                    borderRadius: 12,
                                    marginHorizontal: 0,
                                    paddingHorizontal: 10,
                                    height: 48,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: '#40301eff',
                                    justifyContent: 'center',
                                }}
                            >
                                <AntDesign name="lock" size={24} style={{ marginRight: 8 }} color="black" />
                                <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", marginLeft: 12, color: "#374151" }}>
                                    Security Settings
                                </Text>
                                <AntDesign name="right" size={20} style={{ marginLeft: 'auto' }} color="gray" />
                            </TouchableOpacity>
                        </View>

                        {/* --- Mentor Settings --- */}
                        {user?.user_type?.toLowerCase() === "mentor" && (
                            <TouchableOpacity
                                onPress={() => handleDetails("Mentor Settings")}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: 8,
                                    backgroundColor: '#faf8efff',
                                    borderRadius: 12,
                                    marginHorizontal: 0,
                                    paddingHorizontal: 10,
                                    height: 48,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: '#40301eff',
                                    justifyContent: 'center',
                                }}
                            >
                                <AntDesign name="profile" size={24} style={{ marginRight: 8 }} color="black" />
                                <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", marginLeft: 12, color: "#374151" }}>
                                    Mentor Settings
                                </Text>
                                <AntDesign name="right" size={20} style={{ marginLeft: 'auto' }} color="gray" />
                            </TouchableOpacity>
                        )}

                        {/* Close the form container View and the user conditional */}
                    </View>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    backgroundColor: "white",
  },
  profileSection: {
    width: "100%",
    padding: 24,
    alignItems: "center",
    backgroundColor: "white",
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  uploadingIndicator: {
    position: "absolute",
    top: 40,
    left: 40,
  },
  formContainer: {
    paddingHorizontal: 24,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    color: "#111827",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  segmentedControl: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 8,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    height: 48,
  },
  cancelButton: {
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  updateButton: {
    backgroundColor: "#3b82f6",
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#374151",
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "white",
  },
  pinSection: {
    backgroundColor: "white",
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: "center",
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: 16,
  },
  pinButton: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  pinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteSection: {
    padding: 24,
    paddingTop: 8,
  },
  deleteButton: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 12,
    height: 48,
    marginBottom: 32,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: "500",
    color: "white",
  },
  pickerContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  pickerText: {
    fontSize: 16,
    color: "black",
  },
  placeholderText: {
    color: "black",
  },
  pickerWrapper: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    maxHeight: 200,
  },
  picker: {
    backgroundColor: "black",
  },
  mentorSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
   loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "#FAF3E0",
    },
    container: {
        flex: 1,
        backgroundColor: "#FAF3E0",
        paddingTop: 20,
    },
    scrollView: {
        backgroundColor: 'transparent',
    },
    profileSection: {
        width: '100%',
        padding: 24,
        alignItems: 'center',
        backgroundColor: "#FAF3E0",
    },
    profileAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    uploadingIndicator: {
        position: 'absolute',
        top: 40,
        left: 40,
    },
    formContainer: {
        paddingHorizontal: 24,
        width: '100%',
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#faf8efff',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#40301eff',
        color: '#111827',
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    segmentedControl: {
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 8,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        height: 48,
    },
    cancelButton: {
        backgroundColor: '#d3c8b2ff',
        marginRight: 8,
    },
    updateButton: {
        backgroundColor: '#4f3b2bff',
        marginLeft: 8,
    },
    cancelButtonText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#374151',
    },
    updateButtonText: {
        fontSize: 18,
        fontWeight: '500',
        color: 'white',
    },
    pinSection: {
        backgroundColor: 'white',
        padding: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    pinInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        textAlign: 'center',
        color: '#111827',
        backgroundColor: '#faf8efff',
        marginBottom: 16,
    },
    pinButton: {
        backgroundColor: '#4f3b2bff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    pinButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteSection: {
        padding: 24,
        paddingTop: 8,
    },
    deleteButton: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#dc2626',
        borderRadius: 12,
        height: 48,
        marginBottom: 32,
    },
    deleteButtonText: {
        fontSize: 18,
        fontWeight: '500',
        color: 'white',
    },
    pickerContainer: {
        backgroundColor: '#faf8efff',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#40301eff',
    },
    pickerText: {
        fontSize: 16,
        color: 'black',
    },
    placeholderText: {
        color: 'black',
    },
    pickerWrapper: {
        backgroundColor: '#faf8efff',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#40301eff',
        maxHeight: 200,
    },
    picker: {
        backgroundColor: 'black',
    },
    mentorSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
});