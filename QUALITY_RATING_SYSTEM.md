# Quality Rating System

## Overview

The quality rating system provides a fast, first-pass filtering mechanism for large image collections. This addresses the common scenario where only a small percentage (~1%) of generated images are of good quality, and traditional ELO rating systems are too slow for initial filtering.

## How It Works

### 1. **Three-State Quality Rating**

- **Good (1)**: High-quality images worth keeping and ranking
- **Unrated (0)**: Images that haven't been reviewed yet (default)
- **Bad (-1)**: Low-quality images that should be excluded from battles

### 2. **Quick Rating Interface**

- Large thumbnail view (3 images per row) for better visibility
- Hover over images to reveal thumbs up/down rating buttons
- Instant visual feedback with color-coded badges
- Keyboard shortcuts for even faster rating

### 3. **Multi-Select Mode** (NEW!)

- Click "Multi-Select" button to enter selection mode
- Click images to select/deselect them
- Use bulk action buttons to rate multiple images at once
- Perfect for quickly marking many bad images

### 4. **Dynamic Parameter Filters** (NEW!)

- Automatically detects all generation parameters from your images
- Filter by any parameter value (cfg, orient, sampler, etc.)
- See quality statistics for each parameter value
- Identify which parameter combinations produce good vs bad results
- Combine multiple filters to narrow down specific configurations

### 5. **Integration with ELO System**

- Only "Good" quality images (quality = 1) appear in the Battle Arena
- ELO ratings are preserved but only matter for good images
- This creates a two-stage ranking process:
  1. Quick quality filtering (Good/Bad)
  2. Detailed ELO ranking (for Good images only)

## Benefits

1. **Speed**: Rate hundreds of images quickly with simple thumbs up/down
2. **Bulk Operations**: Select and rate multiple images in one click
3. **Parameter Analysis**: Filter and analyze which generation parameters produce good vs bad results
4. **Pattern Recognition**: Quickly identify parameter combinations that work
5. **Efficient Battles**: Battle Arena only shows pre-filtered good images
6. **Scalability**: Handle projects with 5,000+ images effectively

## Implementation Details

### Frontend Features

- **Pagination**: Load 50 images at a time to handle large collections
- **Lazy Loading**: Images load as needed for better performance
- **Multi-Select**: Click to select multiple images for bulk operations
- **Dynamic Filters**: Automatically generated filters for all generation parameters
- **Hover UI**: Rating buttons appear on hover for single image rating
- **Visual Indicators**: Color-coded badges, selection rings, and quality statistics

### Backend Features

- **Quality Field**: New database field with values -1, 0, or 1
- **API Endpoints**:
  - PATCH `/api/v1/media/:id/quality` (single update)
  - PATCH `/api/v1/media/bulk-quality` (bulk update)
  - GET `/api/v1/projects/:id/media/generation-params` (get unique params)
- **Filtered Queries**: Battle pairs and leaderboards only include good images
- **Migration Script**: Adds quality field to existing media documents

### Database Schema Update

```javascript
quality: { type: Number, default: 0, required: true, enum: [-1, 0, 1] }
```

## Usage Guide

### Single Image Rating

1. Navigate to your project's gallery view
2. Hover over any image to see rating buttons
3. Click thumbs up (or press 1) to mark as Good
4. Click thumbs down (or press 2) to mark as Bad
5. Images update instantly with visual feedback

### Multi-Select Rating

1. Click "Multi-Select" button to enter selection mode
2. Click images to select them (shows blue ring and checkbox)
3. Use "Select All" to select all visible images
4. Click "Mark as Good" or "Mark as Bad" to rate all selected
5. Press Escape or click "Exit Selection" to return to normal mode

### Dynamic Parameter Filtering

1. Click "Filters" button to show parameter filters panel
2. Each detected parameter has its own dropdown filter
3. Select specific values to filter images
4. View quality statistics for each parameter value:
   - Total count
   - Percentage of good images
   - Good/Bad/Unrated breakdown
5. Combine multiple filters to find specific configurations
6. Use "Clear All Filters" to reset

### Keyboard Shortcuts

- **1**: Mark hovered image as Good
- **2**: Mark hovered image as Bad
- **Ctrl/Cmd + A**: Select all (in selection mode)
- **Escape**: Exit selection mode

### Viewing Results

- **Gallery**: Shows all images with quality badges
- **Quality Filter**: View only Good, Bad, or Unrated images
- **Parameter Filters**: Filter by specific generation parameters
- **Battle Arena**: Only shows Good quality images
- **Leaderboard**: Rankings limited to Good quality images

### Analyzing Parameters

After rating your images, you can:

1. **Filter by Quality**: See only Good or Bad images
2. **Apply Parameter Filters**: Focus on specific parameter values
3. **Analyze Success Rates**: Each parameter value shows percentage of good images
4. **Identify Patterns**: Find which parameter combinations consistently produce good results
5. **Optimize Future Runs**: Use insights to improve generation parameters

Example workflow:

- Rate a batch of images
- Click Filters and notice cfg=7.0 has 80% good rate
- But cfg=4.0 has only 5% good rate
- Filter to cfg=7.0 and sampler="euler"
- See that this combination has 95% good rate
- Use these parameters for future generations

## Migration Instructions

For existing projects, run the migration script to add quality field:

```bash
cd backend
node scripts/add-quality-field.js
```

This will set all existing media to quality = 0 (unrated).

## Best Practices

1. **Use Multi-Select for Obvious Bad Images**: Quickly select and mark clearly bad images
2. **Single Rating for Borderline Cases**: Use hover rating for images that need closer inspection
3. **Explore Parameter Filters**: Spend time understanding which parameters work best
4. **Document Successful Parameters**: Keep notes on parameter combinations that produce good results
5. **Work in Batches**: Process one page at a time systematically
6. **Filter Views**: Use quality and parameter filters to review your ratings
7. **Regular Reviews**: Re-rate as your quality standards evolve
