import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '@/presentation/components/ui/SkeletonBox';

export function ProfileSkeleton() {
  return (
    <View className="px-5 pt-4 space-y-6">
      {/* Header Profile Skeleton */}
      <View className="items-center py-4">
        {/* Avatar */}
        <SkeletonBox className="w-24 h-24 rounded-full mb-3 border-2 border-charcoal/40" />
        
        {/* Name */}
        <SkeletonBox className="h-6 w-48 rounded-md mb-2" />
        
        {/* Email / Subtitle */}
        <SkeletonBox className="h-4 w-36 rounded-md mb-4" />

        {/* Rating Pill Skeleton */}
        <SkeletonBox className="h-11 w-44 rounded-full" />
      </View>

      {/* Vehicle Card Skeleton */}
      <View className="bg-[#1A1A1C] border border-[#2C2C2E] rounded-2xl p-4 space-y-3">
        <View className="flex-row items-center justify-between">
          <SkeletonBox className="h-4 w-32 rounded-md" />
          <SkeletonBox className="h-6 w-20 rounded-md" />
        </View>
        <SkeletonBox className="h-6 w-52 rounded-md" />
        <SkeletonBox className="h-4 w-28 rounded-md" />
      </View>

      {/* Options Skeletons */}
      <View className="space-y-3 pt-2">
        <SkeletonBox className="h-14 w-full rounded-2xl" />
        <SkeletonBox className="h-14 w-full rounded-2xl" />
        <SkeletonBox className="h-14 w-full rounded-2xl" />
      </View>

      {/* Logout Skeleton */}
      <View className="pt-6 pb-8">
        <SkeletonBox className="h-12 w-full rounded-xl" />
      </View>
    </View>
  );
}
