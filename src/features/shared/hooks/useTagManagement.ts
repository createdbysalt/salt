"use client";

import { useState, useEffect } from "react";
import { 
  Tag, 
  TagType, 
  getBuiltInTags, 
  getNextTagColor 
} from "../types/tags";
import {
  getTagsAction,
  createTagAction,
  deleteTagAction,
  initializeBuiltInTagsAction,
} from "@/app/actions/tags/tag-actions";

const STORAGE_KEY_PREFIX = 'salt-tags-';

export function useTagManagement(type: TagType) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  // Load tags from Supabase on mount
  useEffect(() => {
    let mounted = true;

    async function loadTags() {
      try {
        // Try to initialize built-in tags first (idempotent)
        await initializeBuiltInTagsAction(type);

        // Fetch all tags for this type
        const response = await getTagsAction(type);

        if (mounted) {
          if (response.success) {
            setTags(response.data);
            setUseLocalStorage(false);
          } else {
            console.warn('Failed to load tags from Supabase, falling back to localStorage:', 'error' in response ? response.error : 'Unknown error');
            // Fallback to localStorage
            loadFromLocalStorage();
            setUseLocalStorage(true);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading tags:', error);
        if (mounted) {
          // Fallback to localStorage
          loadFromLocalStorage();
          setUseLocalStorage(true);
          setLoading(false);
        }
      }
    }

    function loadFromLocalStorage() {
      const builtInTags = getBuiltInTags(type);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${type}`);
        if (stored) {
          try {
            const customTags = JSON.parse(stored) as Tag[];
            setTags([...builtInTags, ...customTags]);
            return;
          } catch (e) {
            console.error('Failed to parse stored tags:', e);
          }
        }
      }
      setTags(builtInTags);
    }

    loadTags();

    return () => {
      mounted = false;
    };
  }, [type]);

  // Persist custom tags to localStorage when using fallback mode
  useEffect(() => {
    if (useLocalStorage && typeof window !== 'undefined') {
      const customTags = tags.filter(t => !t.isBuiltIn);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, JSON.stringify(customTags));
    }
  }, [tags, type, useLocalStorage]);

  const createTag = async (label: string): Promise<Tag | null> => {
    // Validate label
    if (!label.trim()) {
      return null;
    }

    // Check for duplicate labels
    const labelLower = label.toLowerCase().trim();
    if (tags.some(t => t.label.toLowerCase() === labelLower)) {
      return null;
    }

    // If using localStorage fallback, create locally
    if (useLocalStorage) {
      const newTag: Tag = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        label: label.trim(),
        type,
        color: getNextTagColor(tags),
        icon: 'Tag',
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
      };
      setTags(prev => [...prev, newTag]);
      return newTag;
    }

    // Otherwise, create via Supabase
    try {
      const response = await createTagAction(
        type,
        label.trim(),
        getNextTagColor(tags),
        'Tag'
      );

      if (response.success) {
        setTags(prev => [...prev, response.data]);
        return response.data;
      } else {
        console.error('Failed to create tag:', 'error' in response ? response.error : 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      return null;
    }
  };

  const deleteTag = async (tagId: string): Promise<boolean> => {
    const tag = tags.find(t => t.id === tagId);
    
    // Cannot delete built-in tags
    if (!tag || tag.isBuiltIn) {
      return false;
    }

    // If using localStorage fallback, delete locally
    if (useLocalStorage) {
      setTags(prev => prev.filter(t => t.id !== tagId));
      return true;
    }

    // Otherwise, delete via Supabase
    try {
      const response = await deleteTagAction(tagId);

      if (response.success) {
        setTags(prev => prev.filter(t => t.id !== tagId));
        return true;
      } else {
        console.error('Failed to delete tag:', 'error' in response ? response.error : 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  };

  const getTagById = (tagId: string): Tag | undefined => {
    return tags.find(t => t.id === tagId);
  };

  const getTagsByIds = (tagIds: string[]): Tag[] => {
    return tagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[];
  };

  return {
    tags,
    loading,
    createTag,
    deleteTag,
    getTagById,
    getTagsByIds,
  };
}

