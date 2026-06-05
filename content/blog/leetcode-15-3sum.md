---
title: "[LeetCode] 15. 三数之和"
description: "Letcode Hot 100 / 15.3Sum，力扣热题100中经典问题3数之和解题思路。"
date: 2026-06-04
author: Chanko
authorUrl: /about
category: "算法"
views: 1
workflowStatus: published
published: true
locked: false
pinned: false
tags:
  - LeetCode
  - "Hot 100"
  - "Two Pointers"
---


## 题目

给你一个整数数组 `nums` ，判断是否存在三元组 `[nums[i], nums[j], nums[k]]` 满足 `i != j`、`i != k` 且 `j != k` ，同时还满足 `nums[i] + nums[j] + nums[k] == 0` 。请你返回所有和为 `0` 且不重复的三元组。

注意：答案中不可以包含重复的三元组。

示例 1：

>输入：nums = [-1,0,1,2,-1,-4]
>
>输出：[[-1,-1,2],[-1,0,1]]
>
>解释：
>nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0 。
>
>nums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0 。
>
>nums[0] + nums[3] + nums[4] = (-1) + 2 + (-1) = 0 。
>
>不同的三元组是 [-1,0,1] 和 [-1,-1,2] 。
>
>注意，输出的顺序和三元组的顺序并不重要。

示例 2：

>输入：nums = [0,1,1]
>
>输出：[]
>
>解释：唯一可能的三元组和不为 0 。

示例 3：

>输入：nums = [0,0,0]
>
>输出：[[0,0,0]]
>
>解释：唯一可能的三元组和为 0 。
 

提示：

- `3 <= nums.length <= 3000`
- `105 <= nums[i] <= 105`

## 思路/解法

在不考虑任何限制条件的情况下去解决该问题，可以很轻松想到的一个思路是：

进行三层循环，遍历数组中的所有元素，判断是否存在三个元素的和为 0。如果存在，就将这三个元素添加到结果中，并检查是否重复。

显然，这个方法的时间复杂度是 O(n^3)，且去重等操作也会消耗大量空间、

该如何避免重复问题？

我们可以先将数组排序，此时循环遍历数组的三元组`[a, b, c]`,便可使 `a <= b <= c`, 在这种情况下，可以避免`[b, a, c]`、`[c, b, a]`等重复情况的出现。

同时我们通过题目可以得知，`a + b + c = 0`, 当确定一个元素a的值，可以得到 `b + c = -a`，此时当我们确定b值，可以得到一个固定的c值，且当b值增加时，c值会减少。

因此我们可以使用双指针的方法，当我们需要枚举数组中的两个元素时，如果我们发现随着第一个元素的递增，第二个元素是递减的，那么就可以使用双指针的方法，此时会将时间复杂度从 `O(n^2)` 降到 `O(n)`。

## 实现

```ts [Code.ts]
function threeSum(nums: number[]): number[][] {
    const result = new Array<Array<number>>()

    // 当数组长度小于 3 时，不存在三元组
    if (nums.length < 3) return result;

    // 排序数组（方便去重）
    nums = nums.sort((a, b) => a - b)

    for (let i = 0; i < nums.length; i++) {
        // 当 a > 0 时，三数之和一定大于 0
        if (nums[i] > 0) break
        // 当 a 与前一个元素相同时，跳过（去重）
        if (i > 0 && nums[i] === nums[i - 1]) continue

        let left = i + 1;
        let right = nums.length - 1;
        const target = -nums[i]

        while (left < right) {
            const sum = nums[left] + nums[right]
            
            if (sum === target) {
                result.push([nums[i], nums[left], nums[right]])
                left++
                right--

                // 当 b 与前一个元素相同时，跳过（去重）
                while (left < right && nums[left] === nums[left - 1]) left++
                // 当 c 与后一个元素相同时，跳过（去重）
                while (left < right && nums[right] === nums[right + 1]) right--
            }
            // 当 sum < target 时，需要增加 b 值，即 left 指针右移
            else if (sum < target) left++
            // 当 sum > target 时，需要减少 c 值，即 right 指针左移
            else right--          
        }
    }

    return result
};
```
