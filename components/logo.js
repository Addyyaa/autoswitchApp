import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import PropTypes from 'prop-types';

export const Logo = ({ onPress }) => {
    const svgWidth = 50;
    const svgHeight = 50;
    const rectWidth = svgWidth * 51.099 /100;
    const rectHeight = svgHeight * 51.099 / 100;

    const rectX = svgWidth * 24.45 / 100;
    const rectY = svgHeight * 24.45 / 100;

    const greenRectX = svgWidth * 0.3627145;
    const greenRectY = svgHeight *  0.3627145;
    const greenHeight = svgHeight;
    const greenWidth = svgWidth - greenRectX * 2;

    const rightCornerWhiteRectWidth = (rectWidth + rectX) - svgWidth / 2;
    const rightCornerWhiteRectHeight = rightCornerWhiteRectWidth * 0.53608247;
    const rightCornerWhiteRectX = svgWidth / 2;
    const rightCornerWhiteRectY = (rectHeight + rectY) - rightCornerWhiteRectHeight;
    const viewBox = `0 0 ${svgWidth} ${svgHeight}`

    const leftConnerWhiteRectx = rectX;
    const leftConnerWhiteRecty = rectY + rectHeight - 1;
    const leftConnerWhiteRectHeight = rectY * 0.3869863;
    const leftConnerWhiteRectWidth = greenRectX - rectX;

    const cx = rectWidth + rectX;
    const cy = rectHeight + rectY;
    const r = svgWidth * 0.08658346;
    const borderRadius = svgWidth * 0.2;

    

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}> 
        <View style={{ backgroundColor: '#00D3B8', padding: 10, borderRadius }}>
            <Svg width={svgWidth} height={svgHeight} viewBox={viewBox}>
                {/* 白色主方块 */}
                <Rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} fill="#FFFFFF" />

                {/* 白色方块左侧的青绿色填充部分 */}
                <Rect x={greenRectX} y={greenRectY} width={greenWidth} height={greenHeight} fill="#00D0C3" />
                
                {/* 左下角的白色填充部分 */}
                <Rect x={leftConnerWhiteRectx} y={leftConnerWhiteRecty} width={leftConnerWhiteRectWidth} height={leftConnerWhiteRectHeight} fill="#FFFFFF" />

                {/* 右下角的白色填充部分 */}
                <Rect x={rightCornerWhiteRectX} y={rightCornerWhiteRectY} width={rightCornerWhiteRectWidth} height={rightCornerWhiteRectHeight} fill="#FFFFFF" />

                {/* 黄色圆形 */}
                <Circle cx={cx} cy={cy} r={r} fill="#F7CB14" />

                {/* 黄色圆形的绿色重叠部分 */}
                <Path
                d={`M ${cx} ${cy - r} 
                A ${r} ${r} 0 0 0 ${cx - r} ${cy}
                L ${cx} ${cy} Z`}
                fill="#009983"
                />
            </Svg>
        </View>
    </TouchableOpacity>
  );
};

// PropTypes 校验 nPress 必须是一个函数
Logo.propTypes = {
    onPress: PropTypes.func.isRequired,
};