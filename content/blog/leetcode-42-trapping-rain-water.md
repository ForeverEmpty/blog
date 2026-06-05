---
title: "[LeetCode] 42. 接雨水"
description: "Letcode Hot 100 / 42.trapping-rain-water，力扣热题100中经典问题接雨水解题思路。"
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

给定 `n` 个非负整数表示每个宽度为 `1` 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。

示例 1：

![42.trapping-rain-water-1](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2018/10/22/rainwatertrap.png)

> 输入：height = \[0,1,0,2,1,0,1,3,2,1,2,1\]
>
> 输出：6
>
> 解释：上面是由数组 \[0,1,0,2,1,0,1,3,2,1,2,1\] 表示的高度图，在这种情况下，可以接 6 个单位的雨水（蓝色部分表示雨水）。

示例 2：

> 输入：height = \[4,2,0,3,2,5\]
>
> 输出：9

提示：

- `n == height.length`
- `1 <= n <= 2 * 104`
- `0 <= height[i] <= 105`

## 思路/解法

对于该问题，从整体上看，可以将其转化为一个数学问题：

将蓝色与黑色柱子看成一个整体，然后计算整体的面积，最后减去黑色柱子的面积，即可得到接雨水的面积。

然后我们可以将该问题分为一个一个小问题，即如何得到每个柱子整体的面积和黑色柱子面积。

每个柱子的整体面积同 [11. Container With Most Water](https://leetcode.cn/problems/container-with-most-water/) 方式类似，即取决于左侧或右侧最低的柱子高度。我们维护两个变量 `maxL` 和 `maxR`，分别表示左侧最高柱子高度和右侧最高柱子高度。
此时每一个柱子的整体面积为 `Math.min(maxL, maxR)`，可接到的雨水高度为 `Math.min(maxL, maxR) - height[i]`，其中 `height[i]` 为当前柱子的高度。

## 实现

```ts [Code.ts]
function trap(height: number[]): number {
    // 少于三个柱子，无法接雨水
    if (height.length < 3) return 0

    let sum = 0
    let l = 0
    let r = height.length - 1
    // 左侧最高柱子高度
    let maxL = 0
    // 右侧最高柱子高度
    let maxR = 0

    while (l < r) {
        maxL = Math.max(height[l], maxL)
        maxR = Math.max(height[r], maxR)
        
        if (height[l] < height[r]) {
            // 右侧最高柱子高度大于等于左侧最高柱子高度，此时接水取决于左侧最高柱子高度
            // 左侧最高柱子高度减去当前柱子高度，即可得到当前柱子可以接到的雨水高度
            sum += maxL - height[l]
            l++
        } else {
            // 左侧最高柱子高度大于等于右侧最高柱子高度，此时接水取决于右侧最高柱子高度
            // 右侧最高柱子高度减去当前柱子高度，即可得到当前柱子可以接到的雨水高度
            sum += maxR - height[r]
            r--
        }
    }

    return sum
};
```
