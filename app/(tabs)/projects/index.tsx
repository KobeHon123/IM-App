import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, X, Camera, ArrowUpDown } from 'lucide-react-native';
import { usePlatformImagePicker } from '@/hooks/usePlatformImagePicker';
import { useData } from '@/hooks/useData';
import { DesignerSelector } from '@/components/DesignerSelector';
import { SearchBar } from '@/components/SearchBar';
import { ProjectCard } from '@/components/ProjectCard';
import { Project } from '@/types';
import { ThemedText } from '@/components/ThemedText';

export default function ProjectsScreen() {
  const { projects, createProject, updateProject, deleteProject, profiles } = useData();
  const { requestPermissionsAsync, launchImageLibraryAsync } = usePlatformImagePicker();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectActionModal, setShowProjectActionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    pic: '',
    thumbnail: '',
  });
  const [editingProject, setEditingProject] = useState({
    name: '',
    description: '',
    pic: '',
    thumbnail: '',
  });
  const [newProjectPics, setNewProjectPics] = useState<string[]>([]);
  const [editingProjectPics, setEditingProjectPics] = useState<string[]>([]);

  const filteredProjects = [...projects]
    .filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.pic.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortAsc) {
        // Alphabetical (A → Z) by full name
        return a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase());
      }

      // When toggle is off: sort by created_at, newest first
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

  // Check if project name already exists
  const isProjectNameDuplicate = newProject.name.trim() !== '' && 
    projects.some(p => p.name.toLowerCase() === newProject.name.trim().toLowerCase());

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || newProjectPics.length === 0) {
      Alert.alert('Error', 'Please fill in project name and at least one PIC');
      return;
    }

    const projectToCreate = {
      ...newProject,
      pic: newProjectPics.join(', '),
    };
    console.log('Creating project:', projectToCreate);
    await createProject(projectToCreate);
    setNewProject({ name: '', description: '', pic: '', thumbnail: '' });
    setNewProjectPics([]);
    setShowCreateModal(false);
  };

  const handleEditProject = async () => {
    if (!selectedProject || !editingProject.name.trim() || editingProjectPics.length === 0) {
      Alert.alert('Error', 'Please fill in project name and at least one PIC');
      return;
    }

    const projectToUpdate = {
      ...editingProject,
      pic: editingProjectPics.join(', '),
    };
    console.log('Editing project ID:', selectedProject.id, projectToUpdate);
    await updateProject(selectedProject.id, projectToUpdate);
    setShowEditModal(false);
    setSelectedProject(null);
  };

  const handleDeleteProject = () => {
    // Open typed-confirm modal instead of simple alert
    if (!selectedProject) {
      console.log('No project selected for deletion');
      return;
    }
    setDeleteConfirmText('');
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!selectedProject) return;
    if (deleteConfirmText.trim() !== selectedProject.name.trim()) {
      Alert.alert('Name mismatch', 'The name you typed does not match the project name.');
      return;
    }

    console.log('Deleting project ID:', selectedProject.id);
    const success = await deleteProject(selectedProject.id);
    setShowDeleteConfirmModal(false);
    setShowProjectActionModal(false);
    setSelectedProject(null);
    setDeleteConfirmText('');
    if (success) {
      console.log('Project deleted successfully');
    }
  };

  const handleProjectAction = (action: string) => {
    if (!selectedProject) {
      console.log('No project selected for action:', action);
      return;
    }

    console.log('Project action:', action, 'for project ID:', selectedProject.id);
    switch (action) {
      case 'edit':
        setEditingProject({
          name: selectedProject.name,
          description: selectedProject.description,
          pic: '',
          thumbnail: selectedProject.thumbnail || '',
        });
        setEditingProjectPics(selectedProject.pic.split(', ').filter(p => p.trim()));
        setShowEditModal(true);
        break;
      case 'delete':
        handleDeleteProject();
        break;
    }
    setShowProjectActionModal(false);
  };

  const handleSelectThumbnail = async (isEdit = false) => {
    const hasPermission = await requestPermissionsAsync();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'We need access to your gallery to select a thumbnail.');
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: 'Images',
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result) {
      const uri = result.uri;
      console.log('Selected thumbnail:', uri);
      if (isEdit) {
        setEditingProject(prev => ({ ...prev, thumbnail: uri }));
      } else {
        setNewProject(prev => ({ ...prev, thumbnail: uri }));
      }
    }
  };

  const handleRemovePicFromCreate = (pic: string) => {
    setNewProjectPics(prev => prev.filter(p => p !== pic));
  };

  const handleRemovePicFromEdit = (pic: string) => {
    setEditingProjectPics(prev => prev.filter(p => p !== pic));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Projects</ThemedText>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search projects..."
          containerStyle={{ flex: 1, marginHorizontal: 0 }}
        />
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortAsc(prev => !prev)}
          accessibilityLabel="Toggle sort order"
        >
          <ArrowUpDown color={sortAsc ? '#2563EB' : '#374151'} size={20} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => {
              console.log('Navigating to project ID:', item.id);
              router.push(`/(tabs)/projects/${item.id}`);
            }}
            onMorePress={() => {
              console.log('Opening project action modal for ID:', item.id);
              setSelectedProject(item);
              setShowProjectActionModal(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity 
        style={styles.floatingAddButton}
        onPress={() => {
          console.log('Opening create project modal');
          setShowCreateModal(true);
        }}
      >
        <Plus color="#FFFFFF" size={28} />
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Create New Project</ThemedText>
            <TouchableOpacity 
              onPress={() => {
                console.log('Closing create project modal');
                setShowCreateModal(false);
              }}
            >
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Project Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={newProject.name}
                onChangeText={(text) => setNewProject(prev => ({ ...prev, name: text }))}
                placeholder="Enter project name"
                placeholderTextColor="#6B728080"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>PIC (up to 2) *</ThemedText>
              <DesignerSelector
                value={newProject.pic}
                onChangeText={(text) => {
                  // only update the input while typing
                  setNewProject(prev => ({ ...prev, pic: text }));
                }}
                onSelectProfile={(name) => {
                  if (!newProjectPics.includes(name) && newProjectPics.length < 2) {
                    setNewProjectPics(prev => [...prev, name]);
                    setNewProject(prev => ({ ...prev, pic: '' }));
                  }
                }}
                profiles={profiles}
                placeholder="Select PIC"
                placeholderTextColor="#6B728080"
                inputStyle={[styles.input, newProjectPics.length >= 2 && styles.disabledInput]}
                editable={newProjectPics.length < 2}
              />
              {newProjectPics.length > 0 && (
                <View style={styles.selectedPicsContainer}>
                  {newProjectPics.map((pic) => (
                    <View key={pic} style={styles.picTag}>
                      <ThemedText style={styles.picTagText}>{pic}</ThemedText>
                      <TouchableOpacity onPress={() => handleRemovePicFromCreate(pic)}>
                        <ThemedText style={styles.picRemoveText}>×</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newProject.description}
                onChangeText={(text) => setNewProject(prev => ({ ...prev, description: text }))}
                placeholder="Enter project description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Project Thumbnail (Optional)</ThemedText>
              <TouchableOpacity 
                style={styles.pictureButton} 
                onPress={() => handleSelectThumbnail(false)}
              >
                <Camera color="#6B7280" size={24} />
                <ThemedText style={styles.pictureButtonText}>Add Thumbnail</ThemedText>
              </TouchableOpacity>
              {newProject.thumbnail && (
                <Image source={{ uri: newProject.thumbnail }} style={styles.thumbnailPreview} />
              )}
            </View>

            {isProjectNameDuplicate && (
              <ThemedText style={styles.duplicateWarning}>A project with this name already exists</ThemedText>
            )}

            <TouchableOpacity 
              style={[styles.createProjectButton, isProjectNameDuplicate && styles.disabledButton]}
              onPress={handleCreateProject}
              disabled={isProjectNameDuplicate}
            >
              <ThemedText style={[styles.createProjectButtonText, isProjectNameDuplicate && styles.disabledButtonText]}>Create Project</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Edit Project</ThemedText>
            <TouchableOpacity 
              onPress={() => {
                console.log('Closing edit project modal');
                setShowEditModal(false);
                setSelectedProject(null);
              }}
            >
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Project Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={editingProject.name}
                onChangeText={(text) => setEditingProject(prev => ({ ...prev, name: text }))}
                placeholder="Enter project name"
                placeholderTextColor="#6B728080"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>PIC (up to 2) *</ThemedText>
              <DesignerSelector
                value={editingProject.pic}
                onChangeText={(text) => {
                  // only update the input while typing
                  setEditingProject(prev => ({ ...prev, pic: text }));
                }}
                onSelectProfile={(name) => {
                  if (!editingProjectPics.includes(name) && editingProjectPics.length < 2) {
                    setEditingProjectPics(prev => [...prev, name]);
                    setEditingProject(prev => ({ ...prev, pic: '' }));
                  }
                }}
                profiles={profiles}
                placeholder="Select PIC"
                placeholderTextColor="#6B728080"
                inputStyle={[styles.input, editingProjectPics.length >= 2 && styles.disabledInput]}
                editable={editingProjectPics.length < 2}
              />
              {editingProjectPics.length > 0 && (
                <View style={styles.selectedPicsContainer}>
                  {editingProjectPics.map((pic) => (
                    <View key={pic} style={styles.picTag}>
                      <ThemedText style={styles.picTagText}>{pic}</ThemedText>
                      <TouchableOpacity onPress={() => handleRemovePicFromEdit(pic)}>
                        <ThemedText style={styles.picRemoveText}>×</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editingProject.description}
                onChangeText={(text) => setEditingProject(prev => ({ ...prev, description: text }))}
                placeholder="Enter project description"
                placeholderTextColor="#6B728080"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Project Thumbnail (Optional)</ThemedText>
              <TouchableOpacity 
                style={styles.pictureButton} 
                onPress={() => handleSelectThumbnail(true)}
              >
                <Camera color="#6B7280" size={24} />
                <ThemedText style={styles.pictureButtonText}>Change Thumbnail</ThemedText>
              </TouchableOpacity>
              {editingProject.thumbnail && (
                <Image source={{ uri: editingProject.thumbnail }} style={styles.thumbnailPreview} />
              )}
            </View>

            <TouchableOpacity 
              style={styles.createProjectButton}
              onPress={handleEditProject}
            >
              <ThemedText style={styles.createProjectButtonText}>Save Changes</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showProjectActionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          console.log('Closing project action modal');
          setShowProjectActionModal(false);
          setSelectedProject(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              console.log('Closing project action modal via backdrop');
              setShowProjectActionModal(false);
              setSelectedProject(null);
            }} 
            activeOpacity={1}
          />
          <View style={styles.actionModal}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleProjectAction('edit')}
            >
              <ThemedText style={styles.actionButtonText}>Edit Project</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleProjectAction('delete')}
            >
              <ThemedText style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Project</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteConfirmModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Confirm Delete</ThemedText>
            <TouchableOpacity 
              onPress={() => {
                setShowDeleteConfirmModal(false);
                setSelectedProject(null);
                setDeleteConfirmText('');
              }}
            >
              <ThemedText style={styles.modalClose}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <ThemedText style={styles.inputLabel}>Type the project name to confirm deletion:</ThemedText>
            <ThemedText style={{ marginBottom: 12, color: '#111827', fontWeight: '700' }}>{selectedProject?.name}</ThemedText>
            <TextInput
              style={styles.input}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type project name"
              placeholderTextColor="#6B728080"
            />

            <TouchableOpacity
              style={[
                deleteConfirmText.trim() !== (selectedProject?.name || '').trim() ? styles.disabledPrimaryButton : styles.deleteConfirmButton,
              ]}
              onPress={confirmDeleteProject}
              disabled={deleteConfirmText.trim() !== (selectedProject?.name || '').trim()}
            >
              <ThemedText style={[
                deleteConfirmText.trim() !== (selectedProject?.name || '').trim() ? styles.disabledPrimaryButtonText : styles.deleteConfirmButtonText,
              ]}>Delete Project</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingVertical: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
  },
  createProjectButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createProjectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  duplicateWarning: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  pictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  pictureButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  thumbnailPreview: {
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    maxWidth: 300,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  selectedPicsContainer: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  picTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  picTagText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  picRemoveText: {
    fontSize: 18,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    backgroundColor: '#2563EB',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  sortButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
  },
  deleteConfirmButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledPrimaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  disabledPrimaryButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
});