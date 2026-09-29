import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Project } from '@/types';
import { User } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={1}>
      {project.thumbnail ? (
        <ImageBackground
          source={{ uri: project.thumbnail }}
          style={styles.background}
          imageStyle={styles.backgroundImage}
        >
          <View style={styles.overlay}>
            <View style={styles.content}>
              <ThemedText style={[styles.title, !project.description && styles.titleNoDescription]}>{project.name}</ThemedText>
              {project.description ? (
                <ThemedText style={styles.description} numberOfLines={2}>
                  {project.description}
                </ThemedText>
              ) : null}
              <View style={styles.footer}>
                <User color="#6B7280" size={16} />
                <ThemedText style={styles.pic}> {project.pic}</ThemedText>
              </View>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.plainCard}>
          <View style={styles.overlayPlain}>
            <View style={styles.content}>
            <ThemedText style={[styles.title, !project.description && styles.titleNoDescription]}>{project.name}</ThemedText>
            {project.description ? (
              <ThemedText style={styles.description} numberOfLines={2}>
                {project.description}
              </ThemedText>
            ) : null}
            <View style={styles.footer}>
              <User color="#6B7280" size={16} />
              <ThemedText style={styles.pic}>{project.pic}</ThemedText>
            </View>
          </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const textShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.15)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 2,
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
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
  background: {
    minHeight: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  plainCard: {
    minHeight: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    opacity: 0.4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  overlayPlain: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 18,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    ...textShadow,
  },
  titleNoDescription: {
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
    ...textShadow,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pic: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    ...textShadow,
  },

});