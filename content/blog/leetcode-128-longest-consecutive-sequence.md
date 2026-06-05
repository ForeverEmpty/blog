---
title: "[LeetCode] 128. 最长连续序列"
description: "Letcode Hot 100 / 128.longest-consecutive-sequence，力扣热题100中经典问题最长连续序列解题思路。"
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
  - "Hash Table"
  - "Union Find"
---


## 题目

给定一个未排序的整数数组 nums ，找出数字连续的最长序列（不要求序列元素在原数组中连续）的长度。

请你设计并实现时间复杂度为 O(n) 的算法解决此问题。

示例 1：

> 输入：nums = \[100,4,200,1,3,2\]
>
> 输出：4
>
> 解释：最长数字连续序列是 \[1, 2, 3, 4\]。它的长度为 4。

示例 2：

> 输入：nums = \[0,3,7,2,5,8,4,6,0,1\]
>
> 输出：9
>
> 解释：最长数字连续序列是 \[0, 1, 2, 3, 4, 5, 6, 7, 8\]。它的长度为 9。

示例 3：

> 输入：nums = \[1,0,1,2\] 输出：3

提示：

- `0 <= nums.length <= 105`
- `-109 <= nums[i] <= 109`

## 思路/解法

首先在不考虑任何限制条件的情况下去解决该问题，可以很轻松想到的一个思路是：

遍历数组，将每个元素 x 作为起始元素，然后检查 x+1, x+2, ... 是否也在数组中。如果都在，就更新最长序列的长度。

随后我们可以发现，这个方法的时间复杂度是 O(n^2)，其中我们遍历了很多不必要的元素以及重复检查了一些元素。

第二个思路是：

我们可以先将数组排序，然后遍历数组，对于每个元素 x，x 作为起始元素，然后检查 x+1, x+2, ... 是否也在数组中。如果都在，就更新最长序列的长度。

这个方法的时间复杂度是 O(nlogn)，其中排序的时间复杂度是 O(nlogn)，遍历数组的时间复杂度是 O(n)。

根据上面两种思路可以想到几个方面的优化思路：

1. 我们可以用一个 HashSet 来存储数组中的元素，这样可以在 O(1) 的时间复杂度内判断一个元素是否在数组中，同时可以将数组元素去重。
2. 我们可以判断 x 是否是一个序列的起始元素，只需要判断 x-1 是否在 HashSet 中即可。如果不在，就说明 x 是一个序列的起始元素。

## 实现

```ts [Code.ts]
/**
 * @param {number[]} nums
 * @return {number}
 */
function longestConsecutive(nums: number[]): number {
  // 先将数组转换为 HashSet，去重并方便判断元素是否在数组中
  const set = new Set(nums);

  let maxLen = 0;
  for (const num of set) {
    // 如果 num-1 在 HashSet 中，说明 num 不是一个序列的起始元素，跳过
    if (set.has(num - 1)) continue;

    // 如果 num-1 不在 HashSet 中，说明 num 是一个序列的起始元素，开始检查连续序列的长度
    let i = num;
    let len = 1;
    while (set.has(i + 1)) {
      i++;
      len++;
    }

    // 更新最长序列的长度
    maxLen = Math.max(maxLen, len);
  }

  return maxLen;
}
```
