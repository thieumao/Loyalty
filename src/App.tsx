/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';

import { runOnJS } from 'react-native-reanimated';
import {
  StyleSheet,
  View,
  Text,
  LayoutChangeEvent,
  PixelRatio,
  TouchableOpacity,
  Alert,
  Clipboard,
  Dimensions,
  Platform,
} from 'react-native';
import { OCRFrame, scanOCR } from 'vision-camera-ocr2';
import {
  useCameraDevices,
  useFrameProcessor,
  Camera,
} from 'react-native-vision-camera';

const App = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [ocr, setOcr] = useState<OCRFrame>();
  // const [pixelRatio, setPixelRatio] = useState<number>(1);
  const [pixelRatioX, setPixelRatioX] = useState<number>(1);
  const [pixelRatioY, setPixelRatioY] = useState<number>(1);

  const [viewX, setViewX] = useState<number>(1);
  const [viewY, setViewY] = useState<number>(1);
  const [viewWidth, setViewWidth] = useState<number>(1);
  const [viewHeight, setViewHeight] = useState<number>(1);
  const devices = useCameraDevices();
  const device = devices.back;
  const isIOS = Platform.OS === 'ios';
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const xPercent = 24;
  const yPercent = 44.5;
  const xTop = screenWidth * xPercent / 100;
  const yTop = screenHeight * yPercent / 100;
  const xBottom = screenWidth - xTop;
  const yBottom = screenHeight - yTop;

  const [w, setW] = useState<number>(screenWidth);
  const [h, setH] = useState<number>(screenHeight);

  const onLayout = (event: any)=> {
    const {x, y, width, height} = event.nativeEvent.layout;
    setViewX(x);
    setViewY(y);
    setViewWidth(width);
    setViewHeight(height);
    // Alert.alert(`x = ${x}, y = ${y}, width = ${width}, height = ${height}`);
  }

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const data = scanOCR(frame);
    runOnJS(setOcr)(data);
    if (frame && frame.width && frame.width !== w) {
      // setW(frame.width);
      runOnJS(setW)(frame.width);
    }
    if (frame && frame.height && frame.height !== h) {
      // setH(frame.height);
      runOnJS(setH)(frame.height);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  const renderOverlay = () => {
    let arr = ocr?.result?.blocks || [];
    // arr = arr.filter(item => {
    //   const frame = item.frame;
    //   const { x, y, boundingCenterX, boundingCenterY, width, height } = frame;
    //   const left = boundingCenterX - width / 2;
    //   const top = boundingCenterY - height / 2;
    //   const xCheck = isIOS ? left * pixelRatioX : left - 80;
    //   const yCheck = isIOS ? y * pixelRatioY : y - 120;
    //   const check1 = xCheck >= xTop && yCheck >= yTop;
    //   const check2 = xCheck <= xBottom && yCheck <= yBottom;
    //   // return check1 && check2;
    //   return true;
    // })

    return (
      <View style={[StyleSheet.absoluteFill]}>
        {/* {arr.slice(0, 1).map((block) => {
          const { x, y, boundingCenterX, boundingCenterY, width, height } = block.frame;
          const left = boundingCenterX - width / 2;
          const top = boundingCenterY - height / 2;
          return(
            <Text
            style={{
              fontSize: 12,
              marginLeft: 100,
              marginTop: 100,
            }}
          >
            {`-value = ${value} \n -left = ${left} \n -top = ${top} \n -x = ${x} \n -y = ${y} \n -boundingCenterX = ${boundingCenterX} \n -boundingCenterY = ${boundingCenterY}`}
          </Text>
          );
        })} */}
        {arr.slice(0, 100).map((block) => {
          const { x, y, boundingCenterX, boundingCenterY, width, height } = block.frame;
          const left = boundingCenterX - width / 2;
          const top = boundingCenterY - height / 2;
          const left1 = block.frame.x;
          const left2 = block.frame.x * pixelRatioX;
          const top1 = block.frame.y;
          const top2 = block.frame.y * pixelRatioY;
          return (
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(block.text);
                Alert.alert(`"${block.text}" copied to the clipboard`);
              }}
              style={{
                position: 'absolute',
                left: isIOS ? block.frame.x * screenWidth / w : block.frame.x,
                top: isIOS ? block.frame.y * screenHeight / h : block.frame.y,
                width: block.frame.width,
                height: block.frame.height,
                borderWidth: 1,
                borderColor: 'yellow',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: 'red',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                {`${block.text}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderFrameView = () => {
    return(
      <View style={[StyleSheet.absoluteFill]}>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
        <View style={{ width: '100%', flex: 1, flexDirection: 'row' }}>
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3  }} />
          <View style={{ opacity: 0, flex: 1 }} onLayout={onLayout} />
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3  }} />
        </View>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3  }} />
      </View>
    );
  }

  const renderLine = () => {
    const array1 = Array(Math.round(4)).fill(0);
    return(
      <View style={{ height: 100, flexDirection: 'row'}}>
      {array1.map(item => {
        return(
          <View style={{ width: 100, height: 100, borderWidth: 1, borderColor: 'red'}}/>
        )
      })}
    </View>
    );
  }

  const renderSize = () => {
    const array2 = Array(Math.round(10)).fill(0);
    return(
      <View style={[StyleSheet.absoluteFill]}>
        <View style={[StyleSheet.absoluteFill]}>
          {array2.map(item => {
            return renderLine();
          })}
        </View>
      </View>
    );
  }

  return device !== undefined && hasPermission ? (
    <>
      <Camera
        style={[StyleSheet.absoluteFill]}
        frameProcessor={frameProcessor}
        device={device}
        isActive={true}
        frameProcessorFps={20}
        onLayout={(event: LayoutChangeEvent) => {
          setPixelRatioX(
            event.nativeEvent.layout.width /
            PixelRatio.getPixelSizeForLayoutSize(
              event.nativeEvent.layout.width
            )
          );
          setPixelRatioY(
            event.nativeEvent.layout.height /
            PixelRatio.getPixelSizeForLayoutSize(
              event.nativeEvent.layout.height
            )
          );
        }}
      />
      {renderFrameView()}
      {renderSize()}
      {renderOverlay()}
    </>
  ) : (
    <View>
      <Text>No available cameras</Text>
    </View>
  );
}

export default App;
