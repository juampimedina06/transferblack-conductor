import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '@/presentation/components/ui/SkeletonBox';

export function ScheduledTripSkeleton() {
  return (
    <View className="w-full">
      {[1, 2, 3].map((key) => (
        <View
          key={key}
          className="w-full bg-[#141417] border border-white/[0.08] rounded-2xl p-4 mb-3.5"
        >
          {/* Top Header: Schedule Date & Recurring Badge */}
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06]">
            <View className="flex-row items-center">
              <SkeletonBox className="w-7 h-7 rounded-full mr-2" />
              <SkeletonBox className="w-36 h-4 rounded-sm" />
            </View>
            <SkeletonBox className="w-16 h-5 rounded-full" />
          </View>

          {/* Passenger Row */}
          <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 mb-3">
            <View className="flex-row items-center flex-1">
              <SkeletonBox className="w-8 h-8 rounded-full mr-2.5" />
              <View className="flex-1">
                <SkeletonBox className="w-28 h-3.5 rounded-sm mb-1" />
                <SkeletonBox className="w-20 h-2.5 rounded-sm" />
              </View>
            </View>
            <SkeletonBox className="w-8 h-8 rounded-full" />
          </View>

          {/* Route Trajectory */}
          <View className="mb-3.5 px-0.5">
            <View className="flex-row items-center mb-2">
              <SkeletonBox className="w-2.5 h-2.5 rounded-full mr-2.5" />
              <SkeletonBox className="w-3/4 h-3.5 rounded-sm" />
            </View>
            <View className="flex-row items-center">
              <SkeletonBox className="w-2.5 h-2.5 rounded-full mr-2.5" />
              <SkeletonBox className="w-2/3 h-3.5 rounded-sm" />
            </View>
          </View>

          {/* Footer: Earnings and Total Fare */}
          <View className="flex-row items-center justify-between pt-2.5 border-t border-white/[0.06]">
            <View>
              <SkeletonBox className="w-16 h-2.5 rounded-sm mb-1" />
              <SkeletonBox className="w-24 h-4 rounded-sm" />
            </View>
            <View className="items-end">
              <SkeletonBox className="w-14 h-2.5 rounded-sm mb-1" />
              <SkeletonBox className="w-20 h-3.5 rounded-sm" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
