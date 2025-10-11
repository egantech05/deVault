import React from 'react';
import { Text } from 'react-native';

export default function AutoShrinkText({
    children,
    style,
    maxLines = 2,
    initialSize = 18,
    minSize = 8,
}) {
    const [fontSize, setFontSize] = React.useState(initialSize);
    const [didFit, setDidFit] = React.useState(false);

    React.useEffect(() => {
        setFontSize(initialSize);
        setDidFit(false);
    }, [children, initialSize]);

    const onTextLayout = (e) => {
        if (didFit) return;
        const lines = e?.nativeEvent?.lines?.length ?? 0;
        if (lines > maxLines && fontSize > minSize) {
            setFontSize((s) => Math.max(minSize, s - 1));
        } else {
            setDidFit(true);
        }
    };

    return (
        <Text numberOfLines={maxLines} onTextLayout={onTextLayout} style={[style, { fontSize }]}>
            {children}
        </Text>
    );
}
