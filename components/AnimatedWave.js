import React, { useRef, useEffect } from 'react';
import { Animated, Button, Easing, StyleSheet, View } from 'react-native';


/**
 * A React component that renders a waving hand animation.
 *
 * @return {JSX.Element} The JSX element representing the waving hand animation.
 */
export default function WaveHand({ children }) {
    const waveRef = useRef(null);
    const animatedValue = useRef(new Animated.Value(0)).current;
    const angleRange = 10 + Math.random() * 10; // 随机角度范围在10-20度之间
    const rotate = animatedValue.interpolate({
        inputRange: [0, 1, 2, 3, 4, 5, 6, 10],
        outputRange: ['0deg', `${angleRange}deg`, `${-angleRange}deg`, `${angleRange}deg`, `${-angleRange}deg`, `${angleRange}deg`, '0deg', '0deg']
    })
    const animate = () => {
        animatedValue.setValue(0);
        const duration = 2000 + Math.random() * 1000; // 动画时长随机在2-3秒之间
        Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 10,
                useNativeDriver: true,
                easing: Easing.quad,
                duration: duration,
            })
        ).start(() => {
            // 循环动画，重新调用自己
            setTimeout(animate, 500 + Math.random() * 1000); // 下次启动随机间隔在500-1500毫秒
        });
    };

    useEffect(() => {
        animate();
    }, []);


    return (
        <View style={styles.conatainer}>
            <Animated.View ref={waveRef} style={[styles.wave, { transform: [{ rotate }] }]}>{children}</Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    conatainer: {
        margin: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});