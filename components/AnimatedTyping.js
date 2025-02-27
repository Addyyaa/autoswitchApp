import React, { useEffect, useState,  useRef } from 'react';
import { StyleSheet, Text, View, LayoutAnimation } from 'react-native';
import PropTypes from 'prop-types';

export const AnimatedTypewriterText = ({
  sentences = [], // 设置默认值
  delay = 1000,   // 设置默认值
  speed = 100,    // 设置默认值
  style = {},     // 设置默认值
}) => {
  const [animatedText, setAnimatedText] = useState('');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [textWidth, setTextWidth] = useState(0);
  const textRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const [cursor, setCursor] = useState('');
  const [num, setNum] = useState(0);
  const [ t, setT ] = useState(false);


  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearInterval(typingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (sentences.length === 0) return;
    if (currentSentenceIndex < sentences.length) {
      startTypingAnimation();
    }
  }, [currentSentenceIndex, sentences, delay]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prevState => !prevState);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  const startTypingAnimation = () => {
    setT(false);
    clearInterval(typingIntervalRef.current); // 清除旧的 interval
    setCursor('|');
  
    const currentSentence = sentences[currentSentenceIndex] || ""; // 当前句子
  
    let index = 0; // 字符索引
    typingIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
  
      if (index <= currentSentence.length) {
        setAnimatedText(currentSentence.substring(0, index)); // 使用 substring 逐步显示
        index++;
        measureTextWidth(); // 在每次更新后重新测量文本宽度
      } else {
        setT(true);
        // setCursor(''); // 结束时隐藏游标
        setShowCursor(false);
        clearInterval(typingIntervalRef.current);
        setTimeout(() => {
          setAnimatedText('');
          setCurrentSentenceIndex(prev => (prev + 1) % sentences.length); // 切换到下一个句子
        }, Math.max(delay, 300)); // 延迟时间最小值
      }
      // 每次更新后重新测量文本宽度
      measureTextWidth();
    }, speed);
  };
  
  
  

  const measureTextWidth = () => {
    if (textRef.current) {
      textRef.current.measure((x, y, width) => {
        setTextWidth(width);
      });
    }
  };

  useEffect(() => {
    if(showCursor){
      setCursor('|');
    }
    else{
      setCursor('');
    }
  }, [showCursor]);


  return (
    <View style={style}>
      <Text 
        ref={textRef}
        style={[styles.text, style]}
        onLayout={measureTextWidth} // 使用 onLayout 测量宽度
      >
        {animatedText} {cursor}
      </Text>
    </View>
  );
};


AnimatedTypewriterText.propTypes = {
  sentences: PropTypes.arrayOf(PropTypes.string).isRequired,
  delay: PropTypes.number,
  speed: PropTypes.number,
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ]),
};

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
    marginBottom: 10,
  },
  cursor: {
    fontSize: 18,
    position: 'absolute',
    opacity: 0.6,
  },
});

// 问题的产生是由于 React 的状态更新是异步的，setAnimatedText(prev => prev + currentSentence[index]) 中的 prev 值可能并不是最新的，导致字符拼接出现偏差。此外，字符索引 index 增长后，如果超出当前字符串范围，可能会引入 undefined，拼接到 animatedText 中。

// 解决方法：改用 substring 切片方法，一次性设置整个句子内容，通过逐步增加 index 值控制显示的字符数量。具体做法是在定时器中每次调用 setAnimatedText(currentSentence.substring(0, index))，将字符从头到尾逐步呈现出来，确保状态始终与字符同步，避免了频繁拼接操作的异步问题。