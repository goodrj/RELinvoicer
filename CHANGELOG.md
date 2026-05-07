# Changelog

## 1.0.0

- Replaced the previous app with a local switchboard label dimension extractor.
- Added DXF-first extraction from CAD geometry.
- Added DXF quantity extraction from nearby `OFF` and `QUANTITY` text.
- Added OpenAI vision analysis for CAD PDF page images.
- Added CAD vector rectangle geometry correction.
- Improved geometry correction so rectangle size can be calculated from CAD page scale when AI misses a dimension.
- Added remarks for shared and inferred dimensions.
- Added live analysis status and elapsed-time display.
- Added TSV copy and Excel export.
- Added beginner-friendly documentation and smoke-test tooling.
