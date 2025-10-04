import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MAIN_CATEGORIES, getSubcategoriesByMain } from '../../constants/categories';
import { useTheme } from '../../contexts/ThemeContext';
import { MediaUploadResult } from '../../services/mediaService';
import { MainCategory, ReportCategory } from '../../types';
import { FileUpload, UploadingFile } from './FileUpload';
import { useStyles } from './CategorySelector.styles';

const { width } = Dimensions.get('window');

interface CategorySelectorProps {
  selectedMainCategory?: MainCategory;
  selectedSubcategory?: ReportCategory;
  onMainCategorySelect: (category: MainCategory) => void;
  onSubcategorySelect: (subcategory: ReportCategory) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  onFileUpload: () => void;
  onRemoveFile: (uri: string) => void;
  onSubmit: () => void;
  uploadedFiles: MediaUploadResult[];
  uploadingFiles?: UploadingFile[];
  isUploading?: boolean;
  isSubmitting?: boolean;
  isFormValid?: boolean;
}

export function CategorySelector({
  selectedMainCategory,
  selectedSubcategory,
  onMainCategorySelect,
  onSubcategorySelect,
  description,
  onDescriptionChange,
  onFileUpload,
  onRemoveFile,
  onSubmit,
  uploadedFiles,
  uploadingFiles,
  isUploading,
  isSubmitting,
  isFormValid,
}: CategorySelectorProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const buttonWidth = (width - 60) / 2; // Account for padding and gap

  const handleMainCategoryPress = (category: MainCategory) => {
    onMainCategorySelect(category);
    // Reset subcategory when main category changes
    if (category === 'other') {
      // For 'other' category, we'll use 'other' as the subcategory too
      onSubcategorySelect('other_crime' as ReportCategory);
    }
  };

  const subcategories = selectedMainCategory && selectedMainCategory !== 'other' 
    ? getSubcategoriesByMain(selectedMainCategory)
    : [];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Report Category</Text>
      
      {/* 2x2 Main Category Buttons */}
      <View style={styles.buttonGrid}>
        {MAIN_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryButton,
              { width: buttonWidth },
              selectedMainCategory === category.value && styles.selectedButton,
            ]}
            onPress={() => handleMainCategoryPress(category.value)}
          >
            {typeof category.icon === 'string' ? (
              <Ionicons
                name={category.icon as any}
                size={32}
                color={selectedMainCategory === category.value ? theme.colors.white : theme.colors.primary}
              />
            ) : (
              <Image
                source={category.icon}
                style={[
                  styles.iconImage,
                  selectedMainCategory === category.value && styles.selectedIconImage,
                ]}
              />
            )}

            <Text
              style={[
                styles.buttonText,
                selectedMainCategory === category.value && styles.selectedButtonText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Form Container - Shows after main category selection */}
      {selectedMainCategory && (
        <View style={styles.formContainer}>
          {/* Subcategory Picker - Only show if not 'other' */}
          {selectedMainCategory !== 'other' && subcategories.length > 0 && (
            <View style={styles.subcategoryContainer}>
              <Text style={styles.subcategoryTitle}>Specific Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedSubcategory}
                  onValueChange={(itemValue) => onSubcategorySelect(itemValue as ReportCategory)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem} // for iOS
                  dropdownIconColor={theme.colors.text}
                >
                  <Picker.Item label="Select specific type..." value="" />
                  {subcategories.map((subcategory) => (
                    <Picker.Item
                      key={subcategory.value}
                      label={subcategory.label}
                      value={subcategory.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Description Input */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe the incident in detail..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={onDescriptionChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* File Upload Section */}
          <FileUpload
            onFileUpload={onFileUpload}
            onRemoveFile={onRemoveFile}
            uploadedFiles={uploadedFiles}
            uploadingFiles={uploadingFiles}
            isLoading={isUploading}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.disabledButton]}
            onPress={onSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

