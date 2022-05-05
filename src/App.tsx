/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
// import { OCRFrame, scanOCR } from 'vision-camera-ocr2';
import {
  useCameraDevices,
  useFrameProcessor,
  Camera,
} from 'react-native-vision-camera';
import ImageEditor, { ImageCropData } from '@react-native-community/image-editor';
import MlkitOcr from 'react-native-mlkit-ocr';

const App = () => {
  const [hasPermission, setHasPermission] = useState(false);

  const devices = useCameraDevices();
  const device = devices.back;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const xPercent = 20;
  const yPercent = 44;
  const left = screenWidth * xPercent / 100;
  const top = screenHeight * yPercent / 100;
  const width = screenWidth * (100 - 2 * xPercent) / 100;
  const height = screenHeight * (100 - 2 * yPercent) / 100;

  const [w, setW] = useState<number>(screenWidth);
  const [h, setH] = useState<number>(screenHeight);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [cropUri, setCropUri] = useState('');
  const [text, setText] = useState('');

  const camera = useRef<Camera>(null);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // const data = scanOCR(frame);
    // runOnJS(setOcr)(data);
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

  const onTakePhoto = async () => {
    console.log('Click take photo');
    const photoData = await camera.current?.takePhoto({
      qualityPrioritization: 'speed',
      flash: 'off',
      skipMetadata: true,
    });
    const uri = `file://${photoData?.path}`;
    setPhotoUri(uri);

    const imageWidth = photoData?.width || 0;
    const imageHeight = photoData?.height || 0;

    const left2 = imageWidth * xPercent / 100;
    const top2 = imageHeight * yPercent / 100;
    const width2 = imageWidth * (100 - 2 * xPercent) / 100;
    const height2 = imageHeight * (100 - 2 * yPercent) / 100;

    const cropData: ImageCropData = {
      offset: { x: left2, y: top2 },
      size: { width: width2, height: height2 },
      resizeMode: 'cover',
    };

    const newUri = await ImageEditor.cropImage(uri, cropData);
    setCropUri(newUri);

    const resultFromFile = await MlkitOcr.detectFromUri(newUri);
    if (resultFromFile) {
      const nextText = resultFromFile.map((item: any) => item?.text || '').join('\n');
      setText(nextText);
    }
  }

  const onClose = async () => {
    setPhotoUri('');
    setCropUri('');
    setText('');
  }

  const renderOverlay = () => {

    return (
      <View style={[StyleSheet.absoluteFill]}>
        {photoUri.length > 0 && (
          <Image style={[{
            position: 'absolute',
            left: 0,
            top: 0,
            width: screenWidth,
            height: screenHeight,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 1
          }]}
            source={{ uri: photoUri }}
            resizeMode="cover"
          />
        )}
        {cropUri.length > 0 && (
          <Image style={[{
            position: 'absolute',
            left: left,
            top: top,
            width: width,
            height: height,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'red'
          }]}
            source={{ uri: cropUri }}
            resizeMode="cover"
          />
        )}
        {text.length > 0 && (
          <Text style={{
            left: left,
            top: top,
            width: width,
            height: height,
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            color: 'red'
          }}>
            {text}
          </Text>
        )}
        {photoUri.length === 0 && (
          <TouchableOpacity style={{
            position: 'absolute',
            bottom: 48,
            width: screenWidth,
            justifyContent: 'center',
            alignItems: 'center',
          }} onPress={onTakePhoto}>
            <Text style={{ color: 'red', fontSize: 20 }}>{`TAKE PHOTO`}</Text>
          </TouchableOpacity>
        )}
        {photoUri.length > 0 && (
          <TouchableOpacity style={{
            top: 48,
            right: 48,
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
          }} onPress={onClose}>
            <Text style={{ color: 'yellow', fontSize: 20 }}>{`CLOSE`}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFrameView = () => {
    return (
      <View style={[StyleSheet.absoluteFill]}>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
        <View style={{ width: '100%', flex: 1, flexDirection: 'row' }}>
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
          <View style={{ opacity: 0, flex: 1 }} />
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
        </View>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
      </View>
    );
  }

  return device !== undefined && hasPermission ? (
    <>
      <Camera
        ref={camera}
        style={[StyleSheet.absoluteFill]}
        frameProcessor={frameProcessor}
        device={device}
        isActive={true}
        enableHighQualityPhotos={true}
        photo={true}
        orientation="portrait"
        frameProcessorFps={5}
      />
      {photoUri.length === 0 && renderFrameView()}
      {renderOverlay()}
    </>
  ) : (
    <View>
      <Text>No available cameras</Text>
    </View>
  );
}

export default App;
