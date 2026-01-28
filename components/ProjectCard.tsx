import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Project } from '@/types';
import { FolderOpen, User, EllipsisVertical } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onMorePress?: () => void;
}

export function ProjectCard({ project, onPress, onMorePress }: ProjectCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.thumbnailContainer}>
          {project.thumbnail ? (
            <Image source={{ uri: project.thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={styles.iconContainer}>
              <FolderOpen color="#2563EB" size={24} />
            </View>
          )}
        </View>
        <View style={styles.content}>
          <ThemedText style={[styles.title, !project.description && styles.titleNoDescription]}>{project.name}</ThemedText>
          {project.description ? (
            <ThemedText style={styles.description} numberOfLines={2}>
              {project.description}
            </ThemedText>
          ) : null}
          <View style={styles.footer}>
            <User color="#6B7280" size={16} />
            <ThemedText style={styles.pic}>PIC: {project.pic}</ThemedText>
          </View>
        </View>
        {onMorePress && (
          <TouchableOpacity style={styles.moreButton} onPress={onMorePress}>
            <EllipsisVertical color="#6B7280" size={20} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  titleNoDescription: {
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pic: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  moreButton: {
    padding: 8,
    marginLeft: 8,
  },
});