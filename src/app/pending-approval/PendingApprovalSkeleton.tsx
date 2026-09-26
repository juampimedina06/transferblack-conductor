import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SkeletonBox } from '../../presentation/components/ui/SkeletonBox';

export function PendingApprovalSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Top Navigation Bar Skeleton */}
      <View className="px-6 py-3 flex-row items-center justify-between border-b border-charcoal/40">
        <View className="flex-row items-center gap-2">
          <SkeletonBox className="w-7 h-7 rounded-lg" />
          <View className="gap-1">
            <SkeletonBox className="w-24 h-3 rounded-sm" />
            <SkeletonBox className="w-32 h-2 rounded-sm" />
          </View>
        </View>
        <SkeletonBox className="w-16 h-8 rounded-full" />
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingVertical: 28, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Aura Badge Skeleton */}
        <View className="items-center mb-6">
          <SkeletonBox className="w-24 h-24 rounded-full mb-4" />
          
          {/* Pill Badge Skeleton */}
          <SkeletonBox className="w-40 h-6 rounded-full mb-3" />

          {/* Title & Description Skeleton */}
          <SkeletonBox className="w-64 h-7 rounded-md mb-3" />
          <SkeletonBox className="w-full max-w-sm h-4 rounded-sm mb-1" />
          <SkeletonBox className="w-4/5 max-w-sm h-4 rounded-sm" />
        </View>

        {/* Vehicle Card Skeleton */}
        <View className="w-full bg-charcoal/20 border border-charcoal/50 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <SkeletonBox className="w-32 h-4 rounded-sm" />
            <SkeletonBox className="w-20 h-6 rounded-md" />
          </View>
          <SkeletonBox className="w-48 h-5 rounded-md mb-2" />
          <SkeletonBox className="w-64 h-4 rounded-sm" />
        </View>

        {/* Progress Pipeline Card Skeleton */}
        <View className="w-full bg-charcoal/30 border border-charcoal/50 rounded-2xl p-5 mb-6">
          <SkeletonBox className="w-48 h-4 rounded-sm mb-5" />

          {/* Step 1 */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <SkeletonBox className="w-7 h-7 rounded-full" />
              <View className="w-0.5 h-6 bg-charcoal/50 my-1" />
            </View>
            <View className="flex-1 pt-1 gap-2">
              <View className="flex-row justify-between">
                <SkeletonBox className="w-40 h-4 rounded-sm" />
                <SkeletonBox className="w-16 h-3 rounded-sm" />
              </View>
              <SkeletonBox className="w-48 h-3 rounded-sm" />
            </View>
          </View>

          {/* Step 2 */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <SkeletonBox className="w-7 h-7 rounded-full" />
              <View className="w-0.5 h-6 bg-charcoal/50 my-1" />
            </View>
            <View className="flex-1 pt-1 gap-2">
              <View className="flex-row justify-between">
                <SkeletonBox className="w-40 h-4 rounded-sm" />
                <SkeletonBox className="w-16 h-3 rounded-sm" />
              </View>
              <SkeletonBox className="w-48 h-3 rounded-sm" />
            </View>
          </View>

          {/* Step 3 */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <SkeletonBox className="w-7 h-7 rounded-full" />
              <View className="w-0.5 h-6 bg-charcoal/50 my-1" />
            </View>
            <View className="flex-1 pt-1 gap-2">
              <View className="flex-row justify-between">
                <SkeletonBox className="w-40 h-4 rounded-sm" />
                <SkeletonBox className="w-16 h-3 rounded-sm" />
              </View>
              <SkeletonBox className="w-48 h-3 rounded-sm" />
            </View>
          </View>

          {/* Step 4 */}
          <View className="flex-row items-start">
            <View className="items-center mr-3.5">
              <SkeletonBox className="w-7 h-7 rounded-full" />
            </View>
            <View className="flex-1 pt-1 gap-2">
              <View className="flex-row justify-between">
                <SkeletonBox className="w-32 h-4 rounded-sm" />
                <SkeletonBox className="w-16 h-3 rounded-sm" />
              </View>
              <SkeletonBox className="w-48 h-3 rounded-sm" />
            </View>
          </View>
        </View>

        {/* SLA Callout Banner Skeleton */}
        <View className="rounded-2xl p-4 mb-8 border border-charcoal/50 bg-charcoal/20 flex-row items-start">
          <SkeletonBox className="w-5 h-5 rounded-full mr-2.5 mt-0.5" />
          <View className="flex-1 gap-2">
            <SkeletonBox className="w-48 h-4 rounded-sm" />
            <SkeletonBox className="w-full h-3 rounded-sm" />
            <SkeletonBox className="w-4/5 h-3 rounded-sm" />
          </View>
        </View>

        {/* Actions Skeleton */}
        <View className="gap-3">
          <SkeletonBox className="w-full h-12 rounded-xl" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PendingApprovalSkeleton;
